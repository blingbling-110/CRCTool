import QtQuick 2.0
import QtQuick.Controls 2.1

MenuItem {
    hoverEnabled: true
    font: Qt.font({
                  family: "华文楷体",
                  pointSize: 13,
                  weight: Font.Bold
                  })
    contentItem: Text {
         text: parent.text
         font: parent.font
         color: parent.hovered? "white": "#eb6100"
         verticalAlignment: Text.AlignVCenter
         elide: Text.ElideRight
     }

    background: Rectangle {
        color: parent.hovered? "#eb6100": "white"

        //上边的横线
        Rectangle {
            color: "#595757"
            height: 1
            width: parent.width
            anchors.top: parent.top
            opacity: 0.5
        }
    }
}
