import QtQuick 2.0
import QtQuick.Controls 2.1

TextField {
    color: "#eb6100"
    anchors.rightMargin: 0
    font.pixelSize: 14
    selectByMouse: true //是否可以选择文本
    selectedTextColor: "white" //设置选择文本的字体颜色
    selectionColor: "#eb6100" //设置选择框的颜色
    verticalAlignment: TextInput.AlignVCenter
    clip: true
    background: Rectangle {
        border.width: 2
        border.color: parent.activeFocus? "#eb6100": "white"
    }
}
