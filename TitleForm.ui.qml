import QtQuick 2.6

Rectangle {
    property alias mouseArea: mouseArea

    width: 400
    height: 80
    color: "#000000"

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        acceptedButtons: Qt.LeftButton //只处理鼠标左键
        // @disable-check M223
        onPressed: {
            //鼠标左键按下事件
            clickPos = Qt.point(mouse.x, mouse.y) // @disable-check M222
        }
        // @disable-check M223
        onPositionChanged: {
            //鼠标位置改变
            //计算鼠标移动的差值
            // @disable-check M222
            var delta = Qt.point(mouse.x - clickPos.x, mouse.y - clickPos.y)
            //设置窗口坐标
            root.setX(root.x + delta.x) // @disable-check M222
            root.setY(root.y + delta.y) // @disable-check M222
        }

        Text {
            id: appName
            x: 98
            y: 8
            width: 277
            height: 64
            color: "#eb6100"
            text: qsTr("CRC工具 ICM")
            verticalAlignment: Text.AlignVCenter
            font.family: "华文楷体"
            font.bold: true
            font.pixelSize: 32
        }

        Image {
            id: icon
            x: 16
            y: 8
            source: "DIAS icon.ico"
        }
    }
}
