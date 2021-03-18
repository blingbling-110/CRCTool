import QtQuick 2.0
import QtQuick.Controls 2.1
import QtQuick.Dialogs 1.2
import "Process.js" as Process

Item {
    width: 486
    height: 481

    Button {
        id:openBtn
        x: 415
        y: 47
        width: 44
        height: 25
        text:qsTr("...")
        font: Qt.font({
                          family: "华文楷体",
                          pointSize: 13,
                          weight: Font.Bold
                      })
        onClicked: {
            fds.open();
        }
        background: Rectangle {
            color: parent.hovered? "#eb6100": "white"
        }
        contentItem: Text {
            text: parent.text
            font: parent.font
            color: parent.hovered? "white": "#eb6100"
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    CustomLabel {
        id: inputLabel
        x: 28
        y: 22
        text: "输入文件："
    }

    CustomTextField {
        id: inputField
        x: 28
        y: 47
        width: 374
        height: 25
    }

    FileDialog {
        id:fds
        title: "选择文件"
        folder: shortcuts.desktop
        selectExisting: true
        selectFolder: false
        selectMultiple: false
        nameFilters: ["hex文件 (*.hex)"]
        onAccepted: {
            inputField.text = String(fds.fileUrl).replace('file:///', '');
//            console.log(fds.fileUrl);
        }
    }

    DropArea{
        anchors.fill: parent;
        onDropped: {
            if(drop.hasUrls){
                inputField.text = String(drop.urls[0]).replace('file:///', '');
//                console.log(drop.urls[0]);
            }
        }
    }

    CustomLabel {
        id: outputLabel
        x: 28
        y: 97
        text: '起始地址 / 结束地址 / 文件名 / CRC位置'
    }

    Image {
        id: plusBtn
        x: 411
        y: 97
        width: 19
        height: 19
        source: "qrc:/res/plusBtn.svg"
        MouseArea {
            anchors.fill: parent
            hoverEnabled: true
            onEntered: parent.source = "qrc:/res/plusBtn_hover.svg"
            onExited: parent.source = "qrc:/res/plusBtn.svg"
            onClicked: {
                outputList.append({
                                      'startAddr': '0x00000000',
                                      'endAddr': '0x00000000',
                                      'fileName': 'output.hex',
                                      'headOrTail': 'head or tail'
                                  });
            }
        }
    }

    Image {
        id: minusBtn
        x: 440
        y: 97
        width: 19
        height: 19
        source: "qrc:/res/minusBtn.svg"
        MouseArea {
            anchors.fill: parent
            hoverEnabled: true
            onEntered: parent.source = "qrc:/res/minusBtn_hover.svg"
            onExited: parent.source = "qrc:/res/minusBtn.svg"
            onClicked: {
                if(outputView.currentIndex >= 0) {
                    outputList.remove(outputView.currentIndex);
                }
            }
        }
    }

    Rectangle {
        x: 28
        y: 122
        width: 431
        height: 101

        ListView {
            id: outputView
            anchors.fill:parent
            clip: true
            ScrollBar.vertical: ScrollBar { }
            ScrollBar.horizontal: ScrollBar { }
            model: {
                var fileText = Process.read('file:./cfg.json');
                if(fileText !== '') {
                    var lines = fileText.split('\n');
                    for(var i = 0; i < lines.length; i++) {
                        if(lines[i] !== '') {
                            outputList.append(JSON.parse(lines[i]));
                        }
                    }
                }
                return outputList;
            }
            delegate: CustomTextField {
                width: parent.width
                text: startAddr + ' / ' + endAddr + ' / ' + fileName + ' / ' + headOrTail
                onTextChanged: {
                    var textList = text.split('/');
                    startAddr = textList[0].trim();
                    endAddr = textList[1].trim();
                    fileName = textList[2].trim();
                    headOrTail = textList[3].trim();
                }
                MouseArea {
                    anchors.fill: parent
                    propagateComposedEvents: true
                    onPressed: {
                        outputView.currentIndex = index;
                        mouse.accepted = false;  // 与propagateComposedEvents属性一起解决TextField被MouseArea覆盖的问题
                    }
                }
            }

            ListModel {
                id: outputList
            }
        }
    }

    CustomLabel {
        id: applLabel
        x: 28
        y: 243
        text: "ECU Calibration Compatibility Code(Appl):"
        visible: false
    }

    CustomTextField {
        id: applField
        x: 28
        y: 273
        width: 431
        height: 25
        text: {
            var fileText = Process.read('file:./cfg.ini');
            if(fileText !== '') {
                return fileText.split('\r\n')[0];
            }else {
                return '';
            }
        }
        visible: false
    }

    CustomLabel {
        id: fblLabel
        x: 28
        y: 320
        text: "ECU Application Software Compatibility Code(FBL):"
    }

    CustomTextField {
        id: fblField
        x: 28
        y: 345
        width: 431
        height: 25
        text: {
            var fileText = Process.read('file:./cfg.ini');
            if(fileText !== '') {
                return fileText.split('\r\n')[1];
            }else {
                return '';
            }
        }
    }

    Image {
        id: start
        x: 206
        y: 376
        width: 75
        height: 94
        source: "qrc:/res/start.svg"
        opacity: enabled? 1.0: 0.3

        MouseArea {
            anchors.fill: parent
            hoverEnabled: true
            onEntered: rotationOn.start()
            onExited: rotationOff.start()
            WorkerScript {
                id: worker
                source: "Process.js"
                onMessage: {
                    if('start' in messageObject) {
                        start.enabled = messageObject.start;
                    }
                    if('msg' in messageObject) {
                        textarea.insert(textarea.text.length, messageObject.msg);
                        textarea.cursorPosition = textarea.text.length;
                    }
                }
            }
            onClicked: {
                var output = [];
                for(var i = 0; i < outputList.count; i++) {
                    var line = {
                        'startAddr': outputList.get(i).startAddr,
                        'endAddr': outputList.get(i).endAddr,
                        'fileName': outputList.get(i).fileName,
                        'headOrTail': outputList.get(i).headOrTail
                    };
                    output.push(line);
                }

                worker.sendMessage({
                                       'hexFile': inputField.text,
                                       'appl': applField.text,
                                       'fbl': fblField.text,
                                       'output': output
                                   });
            }
        }

        RotationAnimation {
            id: rotationOn
            target: start
            from: 0
            to: 90
        }

        RotationAnimation {
            id: rotationOff
            target: start
            from: 90
            to: 0
        }
    }
}
