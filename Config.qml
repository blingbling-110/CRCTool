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
        y: 72
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

    Label {
        id: input
        x: 28
        y: 39
        text: "输入文件："
        font: Qt.font({
                          family: "华文楷体",
                          pointSize: 13,
                          weight: Font.Bold
                      })
        color: "#eb6100"
    }

    CustomTextField {
        id: inputBoxInput
        x: 28
        y: 72
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
            inputBoxInput.text = String(fds.fileUrl).replace('file:///', '');
//            console.log(fds.fileUrl);
        }
    }

    DropArea{
        anchors.fill: parent;
        onDropped: {
            if(drop.hasUrls){
                inputBoxInput.text = String(drop.urls[0]).replace('file:///', '');
//                console.log(drop.urls[0]);
            }
        }
    }

    Label {
        id: appl
        x: 28
        y: 134
        text: "ECU Calibration Compatibility Code(Appl):"
        font: Qt.font({
                          family: "华文楷体",
                          pointSize: 13,
                          weight: Font.Bold
                      })
        color: "#eb6100"
    }

    CustomTextField {
        id: applField
        x: 28
        y: 170
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
    }

    Label {
        id: fbl
        x: 28
        y: 226
        text: "ECU Application Software Compatibility Code(FBL):"
        font: Qt.font({
                          family: "华文楷体",
                          pointSize: 13,
                          weight: Font.Bold
                      })
        color: "#eb6100"
    }

    CustomTextField {
        id: fblField
        x: 28
        y: 262
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
        x: 184
        y: 302
        width: 119
        height: 150
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
            onClicked: worker.sendMessage({
                                              'hexFile': inputBoxInput.text,
                                              'appl': applField.text,
                                              'fbl': fblField.text
                                          });
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
