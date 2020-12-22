WorkerScript.onMessage = function(msg) {
//    test(msg);
//    return;

    WorkerScript.sendMessage({'start': false});
    write('file:./cfg.ini', String(msg.appl + '\r\n' + msg.fbl));//保存输入值

    //解析输出文件列表
    var output = msg.output;
    var outputIni = ''
    for(var i = 0; i < output.length; i++) {
        var outputStr = {
            'startAddr': output[i].startAddr,
            'endAddr': output[i].endAddr,
            'fileName': output[i].fileName,
            'headOrTail': output[i].headOrTail
        };
        outputIni += JSON.stringify(outputStr) + '\n';
        output[i].startAddr = parseInt(output[i].startAddr.replace('0x8', '0xA'));
        output[i].endAddr = parseInt(output[i].endAddr.replace('0x8', '0xA'));
        output[i].content = [];
        output[i].maxAddr = 0;
//        print(i + '\tstartAddr\t' + output[i].startAddr);
//        print(i + '\tendAddr\t' + output[i].endAddr);
//        print(i + '\tfileName\t' + output[i].fileName);
//        print(i + '\theadOrTail\t' + output[i].headOrTail);
    }
    write('file:./cfg.json', outputIni);//保存输出文件配置

    var lineDataLen = 0x20;
    var applRep = {
        'startAddr': 0xA0028020,
        'endAddr': 0xA002802F,
        'content': msg.appl,
        'varName': 'ECU Calibration Compatibility Code(Appl)'
    };
    var fblRep = {
        'startAddr': 0xA0038020,
        'endAddr': 0xA003802F,
        'content': msg.fbl,
        'varName': 'ECU Application Software Compatibility Code(FBL)'
    };
    var replace = [applRep, fblRep];
    for(var i = 0; i < replace.length; i++) {
        if(replace[i].content.length !== 2 * (replace[i].endAddr - replace[i].startAddr + 1)) {
            printMsg('输入的' + replace[i].varName + '长度有误\n注意：不要在开头加上0x\n');
            WorkerScript.sendMessage({'start': true});
            return;
        }
    }

    if(msg.hexFile === '') {
        printMsg('未输入文件\n\n');
        WorkerScript.sendMessage({'start': true});
        return;
    }

    printMsg('开始解析……\n\n');
    var hexLines = read('file:///' + msg.hexFile).split('\r\n');
    var ELAddr = '0000';  // 扩展线性地址(Extended Linear Address)
    var LOAddr = '0000';  // 起始偏移地址(Load offset Address)
    var AbsAddr = '0000';  // 绝对地址(Absolute Address)
    var isEOF = false;

    //解析输入文件
    for(var i = 0; i < hexLines.length; i++) {
        var rec = hexLines[i];
        if(rec === '') {
            continue;  // 跳过空行
        }
        var dataLen = parseInt(rec.slice(1, 3), 16);
        var recAddr = rec.slice(3, 7);
        var recType = rec.slice(7, 9);
        var recData = rec.slice(9, -2);

        switch(recType) {
        case '00':   // 数据记录
            LOAddr = recAddr;
            AbsAddr = ELAddr + LOAddr;
//            printMsg(AbsAddr + '\n');

            for(var j = 0; j < dataLen; j++) {
                var dataAddr = parseInt(AbsAddr, 16) + j;
                var data = parseInt(recData.slice(2 * j, 2 * j + 2), 16);
                for(var k = 0; k < output.length; k++) {
                    if(dataAddr < output[k].startAddr || dataAddr > output[k].endAddr) {
                        continue;
                    }
                    if(output[k].content.length === 0) {
                        printMsg('解析到应写入' + output[k].fileName + '中的内容\n');
                        for(var m = 0; m < output[k].endAddr - output[k].startAddr + 1; m++) {
                            output[k].content[m] = 0;
                        }
                    }
                    output[k].content[dataAddr - output[k].startAddr] = data;
                    //判断并保存最大地址
                    if(dataAddr > output[k].maxAddr) {
                        output[k].maxAddr = dataAddr;
                    }
                }
            }

            break;
        case '01':   // 文件结束记录
            isEOF = true;
            break;
        case '04':   // 扩展线性地址记录
            if(recData.slice(0, 1) === '8') {
                ELAddr = 'A' + recData.slice(-3);
            }else {
                ELAddr = recData;
            }
//            printMsg(ELAddr + '\n');
            break;
        default:  // 其他记录
//            printMsg('\t\t第' + String(i + 1) + '行：' + rec + '\n');
        }

        if(isEOF) {
            break;
        }
    }

    printMsg('\n解析完毕\n');
    printMsg('开始生成……\n\n');

    //输出hex
    for(var i = 0; i < output.length; i++) {
        if(output[i].content.length === 0) {
            printMsg('未解析到应写入' + output[i].fileName + '中的内容\n');
            continue;
        }

        //内容裁剪
        if(output[i].headOrTail === 'tail') {
            output[i].content = output[i].content.slice(0, output[i].maxAddr - output[i].startAddr + 5);
        }else if(output[i].headOrTail === 'head') {
            var rem = (output[i].maxAddr + 1) % 0x100;
            if(rem !== 0) {
                output[i].maxAddr = output[i].maxAddr + 0x100 - rem;
            }
            output[i].content = output[i].content.slice(0, output[i].maxAddr - output[i].startAddr + 1);
        }

        //变量替换
        for(var j = 0; j < replace.length; j++) {
            if(output[i].startAddr <= replace[j].startAddr && output[i].endAddr >= replace[j].endAddr) {
                printMsg('在' + output[i].fileName + '中替换' + replace[j].varName + '\n');
                for(var k = 0; k < 2 * (replace[j].endAddr - replace[j].startAddr + 1); k += 2) {
                    output[i].content[replace[j].startAddr - output[i].startAddr + k / 2] = parseInt(
                                replace[j].content[k] + replace[j].content[k + 1], 16);
                }
            }
        }

        //计算CRC
        printMsg('\n开始计算' + output[i].fileName + '的CRC值……\n');
        if(output[i].headOrTail === 'tail') {
            var crc = cal_CrcCal_16(output[i].content.slice(0, -2));
            var crcStr = padding(crc.toString(16), 4).toUpperCase();
            for(var j = 0; j < 2; j++) {
                output[i].content[output[i].content.length + j - 2] = parseInt(crcStr.slice(2 * j, 2 * j + 2), 16);
            }
        }else if(output[i].headOrTail === 'head') {
            var crc = cal_CrcCal_16(output[i].content.slice(2));
            var crcStr = padding(crc.toString(16), 4).toUpperCase();
            for(var j = 0; j < 2; j++) {
                output[i].content[j] = parseInt(crcStr.slice(2 * j, 2 * j + 2), 16);
            }
        }
        printMsg(output[i].fileName + '的CRC值：0x' + crcStr + '\n\n');

        var outText = '';
        var lineDataWrited = 0;
        var checksum = 0;
        var insertELA = true;
        var length = 0;

        for(var j = 0; j < output[i].content.length; j++) {
            var data = output[i].content[j];
            var dataAddr = padding((output[i].startAddr + j).toString(16), 8).toUpperCase();
            var remainLen = output[i].endAddr - output[i].startAddr + 1 - j;

            if(insertELA) {  // 插入扩展线性地址记录
                outText += ':02000004' + dataAddr.slice(0, 4);
                checksum += 0x02 + 0x04 + parseInt(dataAddr.slice(0, 2), 16);
                checksum += parseInt(dataAddr.slice(2, 4), 16);
                outText += padding((-checksum & 0xFF).toString(16), 2).toUpperCase() + '\n';
                insertELA = false;
                checksum = 0;
            }

            if(lineDataWrited === 0) {
                outText += ':';
                if(remainLen >= lineDataLen) {
                    length = lineDataLen;
                }else {
                    length = remainLen;
                }
                outText += padding(length.toString(16), 2).toUpperCase();
                checksum += length;
                outText += dataAddr.slice(-4);
                checksum += parseInt(dataAddr.slice(-4, -2), 16);
                checksum += parseInt(dataAddr.slice(-2), 16);
                outText += '00';
            }

            outText += padding(data.toString(16), 2).toUpperCase();
            checksum += data;
            lineDataWrited++;
            if(dataAddr.slice(-4) === 'FFFF') {
                insertELA = true;
            }

            if(lineDataWrited >= length) {
                outText += padding((-checksum & 0xFF).toString(16), 2).toUpperCase() + '\n';
                lineDataWrited = 0;
                checksum = 0;
            }
        }

        outText += ':00000001FF\n'
        write('file:///' + msg.hexFile.slice(0, msg.hexFile.lastIndexOf('/') + 1) + output[i].fileName, outText);
    }

    printMsg('\n生成完毕\n');
    WorkerScript.sendMessage({'start': true});
}

function printMsg(msg) {
    WorkerScript.sendMessage({'msg': String(msg)});
}

function read(file) {
    var request = new XMLHttpRequest();
    request.open('GET', file, false);  // false为同步操作设置
    request.send(null);
    return request.responseText;
}

function write(file, text) {
    var request = new XMLHttpRequest();
    request.open('PUT', file, false);  // false为同步操作设置
    request.send(text);
    return request.status;
}

function padding(str, num) {
    while(str.length < num) {
        str = '0' + str;
    }
    if(str.length > num) {
        str = str.slice(str.length - num);
    }

    return str;
}

var Cal_Crc32Tab = [
            0x00000000, 0x06233697, 0x05C45641, 0x03E760D6, 0x020A97ED, 0x0429A17A, 0x07CEC1AC, 0x01EDF73B,
            0x04152FDA, 0x0236194D, 0x01D1799B, 0x07F24F0C, 0x061FB837, 0x003C8EA0, 0x03DBEE76, 0x05F8D8E1,
            0x01A864DB, 0x078B524C, 0x046C329A, 0x024F040D, 0x03A2F336, 0x0581C5A1, 0x0666A577, 0x004593E0,
            0x05BD4B01, 0x039E7D96, 0x00791D40, 0x065A2BD7, 0x07B7DCEC, 0x0194EA7B, 0x02738AAD, 0x0450BC3A,
            0x0350C9B6, 0x0573FF21, 0x06949FF7, 0x00B7A960, 0x015A5E5B, 0x077968CC, 0x049E081A, 0x02BD3E8D,
            0x0745E66C, 0x0166D0FB, 0x0281B02D, 0x04A286BA, 0x054F7181, 0x036C4716, 0x008B27C0, 0x06A81157,
            0x02F8AD6D, 0x04DB9BFA, 0x073CFB2C, 0x011FCDBB, 0x00F23A80, 0x06D10C17, 0x05366CC1, 0x03155A56,
            0x06ED82B7, 0x00CEB420, 0x0329D4F6, 0x050AE261, 0x04E7155A, 0x02C423CD, 0x0123431B, 0x0700758C,
            0x06A1936C, 0x0082A5FB, 0x0365C52D, 0x0546F3BA, 0x04AB0481, 0x02883216, 0x016F52C0, 0x074C6457,
            0x02B4BCB6, 0x04978A21, 0x0770EAF7, 0x0153DC60, 0x00BE2B5B, 0x069D1DCC, 0x057A7D1A, 0x03594B8D,
            0x0709F7B7, 0x012AC120, 0x02CDA1F6, 0x04EE9761, 0x0503605A, 0x032056CD, 0x00C7361B, 0x06E4008C,
            0x031CD86D, 0x053FEEFA, 0x06D88E2C, 0x00FBB8BB, 0x01164F80, 0x07357917, 0x04D219C1, 0x02F12F56,
            0x05F15ADA, 0x03D26C4D, 0x00350C9B, 0x06163A0C, 0x07FBCD37, 0x01D8FBA0, 0x023F9B76, 0x041CADE1,
            0x01E47500, 0x07C74397, 0x04202341, 0x020315D6, 0x03EEE2ED, 0x05CDD47A, 0x062AB4AC, 0x0009823B,
            0x04593E01, 0x027A0896, 0x019D6840, 0x07BE5ED7, 0x0653A9EC, 0x00709F7B, 0x0397FFAD, 0x05B4C93A,
            0x004C11DB, 0x066F274C, 0x0588479A, 0x03AB710D, 0x02468636, 0x0465B0A1, 0x0782D077, 0x01A1E6E0,
            0x04C11DB7, 0x02E22B20, 0x01054BF6, 0x07267D61, 0x06CB8A5A, 0x00E8BCCD, 0x030FDC1B, 0x052CEA8C,
            0x00D4326D, 0x06F704FA, 0x0510642C, 0x033352BB, 0x02DEA580, 0x04FD9317, 0x071AF3C1, 0x0139C556,
            0x0569796C, 0x034A4FFB, 0x00AD2F2D, 0x068E19BA, 0x0763EE81, 0x0140D816, 0x02A7B8C0, 0x04848E57,
            0x017C56B6, 0x075F6021, 0x04B800F7, 0x029B3660, 0x0376C15B, 0x0555F7CC, 0x06B2971A, 0x0091A18D,
            0x0791D401, 0x01B2E296, 0x02558240, 0x0476B4D7, 0x059B43EC, 0x03B8757B, 0x005F15AD, 0x067C233A,
            0x0384FBDB, 0x05A7CD4C, 0x0640AD9A, 0x00639B0D, 0x018E6C36, 0x07AD5AA1, 0x044A3A77, 0x02690CE0,
            0x0639B0DA, 0x001A864D, 0x03FDE69B, 0x05DED00C, 0x04332737, 0x021011A0, 0x01F77176, 0x07D447E1,
            0x022C9F00, 0x040FA997, 0x07E8C941, 0x01CBFFD6, 0x002608ED, 0x06053E7A, 0x05E25EAC, 0x03C1683B,
            0x02608EDB, 0x0443B84C, 0x07A4D89A, 0x0187EE0D, 0x006A1936, 0x06492FA1, 0x05AE4F77, 0x038D79E0,
            0x0675A101, 0x00569796, 0x03B1F740, 0x0592C1D7, 0x047F36EC, 0x025C007B, 0x01BB60AD, 0x0798563A,
            0x03C8EA00, 0x05EBDC97, 0x060CBC41, 0x002F8AD6, 0x01C27DED, 0x07E14B7A, 0x04062BAC, 0x02251D3B,
            0x07DDC5DA, 0x01FEF34D, 0x0219939B, 0x043AA50C, 0x05D75237, 0x03F464A0, 0x00130476, 0x063032E1,
            0x0130476D, 0x071371FA, 0x04F4112C, 0x02D727BB, 0x033AD080, 0x0519E617, 0x06FE86C1, 0x00DDB056,
            0x052568B7, 0x03065E20, 0x00E13EF6, 0x06C20861, 0x072FFF5A, 0x010CC9CD, 0x02EBA91B, 0x04C89F8C,
            0x009823B6, 0x06BB1521, 0x055C75F7, 0x037F4360, 0x0292B45B, 0x04B182CC, 0x0756E21A, 0x0175D48D,
            0x048D0C6C, 0x02AE3AFB, 0x01495A2D, 0x076A6CBA, 0x06879B81, 0x00A4AD16, 0x0343CDC0, 0x0560FB57
        ];

var Cal_Crc16Tab = [
            0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
            0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
            0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
            0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
            0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
            0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
            0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
            0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
            0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
            0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
            0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
            0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
            0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
            0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
            0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
            0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
            0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
            0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
            0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
            0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
            0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
            0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
            0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
            0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
            0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
            0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
            0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
            0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
            0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
            0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
            0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
            0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0
        ];

function cal_CrcCal_32(buf) {
    var curCrc = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) {
        curCrc = (Cal_Crc32Tab[(((curCrc ^ buf[i]) >>> 0) & 0xFF) >>> 0] ^ (curCrc >>> 8)) >>> 0;
    }
    return (curCrc ^ 0xFFFFFFFF) >>> 0;
}

function cal_CrcCal_16(buf) {
    var curCrc = 0xFFFF;
    for (var i = 0; i < buf.length; i++) {
        curCrc = (Cal_Crc16Tab[(((curCrc >>> 8) ^ ((buf[i] & 0xFFFF) >>> 0)) & 0xFF) >>> 0] ^ ((curCrc << 8) >>> 0)) >>> 0;
    }
    return curCrc;
}

function test(msg) {
    var buf = [49, 50, 51, 52, 53, 54, 55, 56, 57];
    print(cal_CrcCal_16(buf).toString(16));

    return;
}
