import QtQuick 2.6
import QtQuick.Window 2.2
import QtQuick.Controls 2.1

Window {
    id: root
    visible: true
    width: 1280
    height: 720
    color: "#00000000"
    flags: Qt.Window | Qt.FramelessWindowHint | Qt.WindowMinimizeButtonHint   //去标题栏

    //记录鼠标移动的位置，此处变量过多会导致移动界面变卡
    property point  clickPos: "0,0"

    //背景图
    Image {
        x: 0
        y: 0
        width: 1280
        height: 720
        source: parent.activeFocus? "qrc:/res/BackGround.png": "qrc:/res/BackGround_n.png"
        fillMode: Image.PreserveAspectFit  //等比例切割
        clip: true  //避免所要渲染的对象超出元素范围

        //处理鼠标移动后窗口坐标逻辑
        MouseArea{
            z: -1
            anchors.fill: parent
            acceptedButtons: Qt.LeftButton  //只处理鼠标左键
            onPressed: {    //鼠标左键按下事件
                clickPos = Qt.point(mouse.x, mouse.y)
            }
            onPositionChanged: {    //鼠标位置改变
                //计算鼠标移动的差值
                var delta = Qt.point(mouse.x - clickPos.x, mouse.y - clickPos.y)
                //设置窗口坐标
                root.setX(root.x + delta.x)
                root.setY(root.y + delta.y)
            }
        }

    }

    TitleForm {
        width: 400
        height: 80
        color: "#00000000"
        anchors.rightMargin: 767
        anchors.bottomMargin: 593
        anchors.leftMargin: 50
        anchors.topMargin: 47
        anchors.fill: parent
    }

    //关闭窗口按钮
    Image {
        x: 493
        y: 77
        width: 20
        height: 20
        source: "qrc:/res/close.svg"

        MouseArea{
            z: 1
            anchors.fill: parent
            onClicked: {
                Qt.quit()               //退出程序
            }
            hoverEnabled: true
            onEntered: parent.source = "qrc:/res/close_hover.svg"
            onExited: parent.source = "qrc:/res/close.svg"
        }
    }

    //最小化窗口按钮
    Image {
        x: 467
        y: 77
        width: 20
        height: 20
        source: "qrc:/res/minus.svg"

        MouseArea{
            z: 1
            anchors.fill: parent
            onClicked: {
                root.showMinimized()        //窗口最小化
            }
            hoverEnabled: true
            onEntered: parent.source = "qrc:/res/minus_hover.svg"
            onExited: parent.source = "qrc:/res/minus.svg"
        }
    }

    //菜单按钮
    Image {
        x: 441
        y: 77
        width: 20
        height: 20
        source: "qrc:/res/menu.svg"

        MouseArea{
            z: 1
            anchors.fill: parent
            hoverEnabled: true
            onEntered: parent.source = "qrc:/res/menu_hover.svg"
            onExited: parent.source = "qrc:/res/menu.svg"
            onClicked: menu.open()

            Menu {
                id: menu
                CustomMenuItem {
                    text: "帮助"
                    onClicked: Qt.openUrlExternally("mailto:qinzijun@dias.com.cn?subject=CRC工具%20ICM")
                }

                CustomMenuItem {
                    text: "关于"
                    onClicked: about.open()
                }
            }
        }
    }

    Dialog {
        id: about
        x: 468
        y: 249
        width: 345
        height: 222
        modal: true

        Label {
            text: "CRC工具 ICM v1.0\n用于ICM项目FLASH分段并计算CRC的工具\n\n作者：覃子俊\n联系方式：qinzijun@dias.com.cn\n时间：2020年11月26日\n\n版权所有 © 2020 覃子俊 保留所有权利"
            font: Qt.font({
                              family: "华文楷体",
                              pointSize: 12,
                              weight: Font.Bold
                          })
            color: "#eb6100"
            width: parent.width
            height: parent.height
            verticalAlignment: Text.AlignVCenter
        }
    }

    Config{
        x: 45
        y: 192
        width: 486
        height: 481
    }

    Flickable {
        id: flickable
        x: 620
        y: 59
        width: 592
        height: 601

        TextArea.flickable: TextArea {
            id: textarea
            font: Qt.font({
                              family: "华文楷体",
                              pointSize: 14,
                              weight: Font.Bold
                          })
            color: "#eb6100"
            selectByMouse: true //是否可以选择文本
            selectedTextColor: "white" //设置选择文本的字体颜色
            selectionColor: "#eb6100" //设置选择框的颜色
            readOnly: true
        }

        ScrollBar.vertical: ScrollBar { }
        ScrollBar.horizontal: ScrollBar { }
    }
}
