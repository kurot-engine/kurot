// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin0.ts
import { Image, Label, SetProperty, Skin, State } from "@blakron/ui";
import { Rectangle } from "@blakron/core";
function createButtonSkin() {
  const skin = new Skin();
  skin.skinParts = ["labelDisplay", "iconDisplay"];
  skin.minWidth = 100;
  skin.minHeight = 50;
  const _image1 = new Image();
  skin._image1 = _image1;
  _image1.percentWidth = 100;
  _image1.percentHeight = 100;
  _image1.scale9Grid = new Rectangle(1, 3, 8, 8);
  _image1.source = "button_up_png";
  const labelDisplay = new Label();
  skin.labelDisplay = labelDisplay;
  labelDisplay.left = 8;
  labelDisplay.right = 8;
  labelDisplay.top = 8;
  labelDisplay.bottom = 8;
  labelDisplay.textAlign = "center";
  labelDisplay.verticalAlign = "middle";
  labelDisplay.textColor = 16777215;
  labelDisplay.size = 20;
  const iconDisplay = new Image();
  skin.iconDisplay = iconDisplay;
  iconDisplay.horizontalCenter = 0;
  iconDisplay.verticalCenter = 0;
  skin.elementsContent = [_image1, labelDisplay, iconDisplay];
  skin.states = [new State("up"), new State("down", [new SetProperty("_image1", "source", "button_down_png")]), new State("disabled", [new SetProperty("_image1", "alpha", 0.5)])];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin3.ts
import { Group, Skin as Skin2 } from "@blakron/ui";
function createGroupSkin() {
  const skin = new Skin2();
  skin.skinParts = ["contentGroup"];
  const contentGroup = new Group();
  skin.contentGroup = contentGroup;
  contentGroup.percentWidth = 100;
  contentGroup.percentHeight = 100;
  skin.elementsContent = [contentGroup];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin5.ts
import { Image as Image2, Skin as Skin3 } from "@blakron/ui";
import { Rectangle as Rectangle2 } from "@blakron/core";
function createHSliderSkin() {
  const skin = new Skin3();
  skin.skinParts = ["track", "thumb"];
  skin.minWidth = 20;
  skin.minHeight = 8;
  const track = new Image2();
  skin.track = track;
  track.source = "track_sb_png";
  track.scale9Grid = new Rectangle2(1, 1, 4, 4);
  track.percentWidth = 100;
  track.height = 6;
  track.verticalCenter = 0;
  const thumb = new Image2();
  skin.thumb = thumb;
  thumb.source = "thumb_png";
  thumb.verticalCenter = 0;
  skin.elementsContent = [track, thumb];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin6.ts
import { Image as Image3, Skin as Skin4 } from "@blakron/ui";
function createImageSkin() {
  const skin = new Skin4();
  skin.skinParts = ["imageDisplay"];
  const imageDisplay = new Image3();
  skin.imageDisplay = imageDisplay;
  imageDisplay.percentWidth = 100;
  imageDisplay.percentHeight = 100;
  skin.elementsContent = [imageDisplay];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin7.ts
import { Image as Image4, Label as Label2, SetProperty as SetProperty2, Skin as Skin5, State as State2 } from "@blakron/ui";
import { Rectangle as Rectangle3 } from "@blakron/core";
function createItemRendererSkin() {
  const skin = new Skin5();
  skin.skinParts = ["labelDisplay"];
  skin.minWidth = 100;
  skin.minHeight = 50;
  const _image1 = new Image4();
  skin._image1 = _image1;
  _image1.percentWidth = 100;
  _image1.percentHeight = 100;
  _image1.source = "button_up_png";
  _image1.scale9Grid = new Rectangle3(1, 3, 8, 8);
  const labelDisplay = new Label2();
  skin.labelDisplay = labelDisplay;
  labelDisplay.left = 8;
  labelDisplay.right = 8;
  labelDisplay.top = 8;
  labelDisplay.bottom = 8;
  labelDisplay.size = 20;
  labelDisplay.fontFamily = "Tahoma";
  labelDisplay.textColor = 16777215;
  labelDisplay.textAlign = "center";
  labelDisplay.verticalAlign = "middle";
  skin.elementsContent = [_image1, labelDisplay];
  skin.states = [new State2("up"), new State2("down", [new SetProperty2("_image1", "source", "button_down_png")]), new State2("disabled", [new SetProperty2("_image1", "alpha", 0.5)])];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin2.ts
import { Label as Label3, List, Rect, Scroller, SetProperty as SetProperty3, Skin as Skin6, State as State3 } from "@blakron/ui";
function createComboBoxSkin() {
  const skin = new Skin6();
  skin.skinParts = ["labelDisplay", "dropDown", "list"];
  skin.minWidth = 100;
  skin.minHeight = 36;
  const _rect1 = new Rect();
  skin._rect1 = _rect1;
  _rect1.percentWidth = 100;
  _rect1.height = 36;
  _rect1.fillColor = 1710638;
  _rect1.strokeColor = 996448;
  _rect1.strokeWeight = 1;
  const labelDisplay = new Label3();
  skin.labelDisplay = labelDisplay;
  labelDisplay.left = 10;
  labelDisplay.right = 36;
  labelDisplay.top = 0;
  labelDisplay.height = 36;
  labelDisplay.verticalAlign = "middle";
  labelDisplay.textColor = 14673641;
  labelDisplay.size = 14;
  const _label2 = new Label3();
  skin._label2 = _label2;
  _label2.right = 4;
  _label2.top = 0;
  _label2.width = 24;
  _label2.height = 36;
  _label2.textAlign = "center";
  _label2.verticalAlign = "middle";
  _label2.textColor = 6516338;
  _label2.text = "\u25BC";
  _label2.size = 10;
  const dropDown = new Scroller();
  skin.dropDown = dropDown;
  dropDown.left = 0;
  dropDown.right = 0;
  dropDown.top = 36;
  dropDown.height = 180;
  dropDown.visible = false;
  const list = new List();
  skin.list = list;
  list.percentWidth = 100;
  list.height = 180;
  dropDown.viewport = list;
  skin.elementsContent = [_rect1, labelDisplay, _label2, dropDown];
  skin.states = [new State3("normal"), new State3("open", [new SetProperty3("_rect1", "fillColor", 1450302), new SetProperty3("_rect1", "strokeColor", 7101671), new SetProperty3("_label2", "textColor", 7101671)]), new State3("disabled", [new SetProperty3("_rect1", "fillColor", 1450302), new SetProperty3("_rect1", "strokeColor", 4871257), new SetProperty3("labelDisplay", "textColor", 6516338)])];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin9.ts
import { DataGroup, Rect as Rect2, Scroller as Scroller2, Skin as Skin7 } from "@blakron/ui";
function createListSkin() {
  const skin = new Skin7();
  skin.skinParts = ["scroller", "dataGroup"];
  skin.minWidth = 20;
  skin.minHeight = 20;
  const _rect1 = new Rect2();
  _rect1.percentWidth = 100;
  _rect1.percentHeight = 100;
  _rect1.fillColor = 1710638;
  _rect1.strokeColor = 996448;
  _rect1.strokeWeight = 1;
  const scroller = new Scroller2();
  skin.scroller = scroller;
  scroller.percentWidth = 100;
  scroller.percentHeight = 100;
  const dataGroup = new DataGroup();
  skin.dataGroup = dataGroup;
  dataGroup.percentWidth = 100;
  dataGroup.percentHeight = 100;
  scroller.viewport = dataGroup;
  skin.elementsContent = [_rect1, scroller];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin1.ts
import { Group as Group2, HorizontalLayout, Image as Image5, Label as Label4, SetProperty as SetProperty4, Skin as Skin8, State as State4 } from "@blakron/ui";
function createCheckBoxSkin() {
  const skin = new Skin8();
  skin.skinParts = ["labelDisplay"];
  const _group1 = new Group2();
  _group1.percentWidth = 100;
  _group1.percentHeight = 100;
  const _horizontalLayout2 = new HorizontalLayout();
  _horizontalLayout2.verticalAlign = "middle";
  _group1.layout = _horizontalLayout2;
  const _image3 = new Image5();
  skin._image3 = _image3;
  _image3.fillMode = "scale";
  _image3.alpha = 1;
  _image3.source = "checkbox_unselect_png";
  const labelDisplay = new Label4();
  skin.labelDisplay = labelDisplay;
  labelDisplay.size = 20;
  labelDisplay.textColor = 7368816;
  labelDisplay.textAlign = "center";
  labelDisplay.verticalAlign = "middle";
  labelDisplay.fontFamily = "Tahoma";
  _group1.elementsContent = [_image3, labelDisplay];
  skin.elementsContent = [_group1];
  skin.states = [new State4("up"), new State4("down", [new SetProperty4("_image3", "alpha", 0.7)]), new State4("disabled", [new SetProperty4("_image3", "alpha", 0.5)]), new State4("upAndSelected", [new SetProperty4("_image3", "source", "checkbox_select_up_png")]), new State4("downAndSelected", [new SetProperty4("_image3", "source", "checkbox_select_down_png")]), new State4("disabledAndSelected", [new SetProperty4("_image3", "source", "checkbox_select_disabled_png")])];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin10.ts
import { Button, Group as Group3, Image as Image6, Label as Label5, Skin as Skin9 } from "@blakron/ui";
import { Rectangle as Rectangle4 } from "@blakron/core";
function createPanelSkin() {
  const skin = new Skin9();
  skin.skinParts = ["moveArea", "titleDisplay", "closeButton"];
  skin.minWidth = 450;
  skin.minHeight = 230;
  const _image1 = new Image6();
  _image1.left = 0;
  _image1.right = 0;
  _image1.top = 0;
  _image1.bottom = 0;
  _image1.source = "border_png";
  _image1.scale9Grid = new Rectangle4(2, 2, 12, 12);
  const moveArea = new Group3();
  skin.moveArea = moveArea;
  moveArea.left = 0;
  moveArea.right = 0;
  moveArea.top = 0;
  moveArea.height = 45;
  const _image2 = new Image6();
  _image2.left = 0;
  _image2.right = 0;
  _image2.top = 0;
  _image2.bottom = 0;
  _image2.source = "header_png";
  _image2.scale9Grid = new Rectangle4(2, 2, 12, 12);
  const titleDisplay = new Label5();
  skin.titleDisplay = titleDisplay;
  titleDisplay.left = 15;
  titleDisplay.right = 5;
  titleDisplay.verticalCenter = 0;
  titleDisplay.size = 20;
  titleDisplay.fontFamily = "Tahoma";
  titleDisplay.textColor = 16777215;
  titleDisplay.wordWrap = false;
  moveArea.elementsContent = [_image2, titleDisplay];
  const closeButton = new Button();
  skin.closeButton = closeButton;
  closeButton.label = "close";
  closeButton.bottom = 5;
  closeButton.horizontalCenter = 0;
  skin.elementsContent = [_image1, moveArea, closeButton];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin4.ts
import { Image as Image7, Skin as Skin10 } from "@blakron/ui";
import { Rectangle as Rectangle5 } from "@blakron/core";
function createHScrollBarSkin() {
  const skin = new Skin10();
  skin.skinParts = ["thumb"];
  skin.minWidth = 20;
  skin.minHeight = 8;
  const thumb = new Image7();
  skin.thumb = thumb;
  thumb.source = "roundthumb_png";
  thumb.scale9Grid = new Rectangle5(3, 3, 2, 2);
  thumb.width = 30;
  thumb.height = 8;
  thumb.verticalCenter = 0;
  skin.elementsContent = [thumb];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin12.ts
import { Group as Group4, HorizontalLayout as HorizontalLayout2, Image as Image8, Label as Label6, SetProperty as SetProperty5, Skin as Skin11, State as State5 } from "@blakron/ui";
function createRadioButtonSkin() {
  const skin = new Skin11();
  skin.skinParts = ["labelDisplay"];
  const _group1 = new Group4();
  _group1.percentWidth = 100;
  _group1.percentHeight = 100;
  const _horizontalLayout2 = new HorizontalLayout2();
  _horizontalLayout2.verticalAlign = "middle";
  _group1.layout = _horizontalLayout2;
  const _image3 = new Image8();
  skin._image3 = _image3;
  _image3.fillMode = "scale";
  _image3.alpha = 1;
  _image3.source = "radiobutton_unselect_png";
  const labelDisplay = new Label6();
  skin.labelDisplay = labelDisplay;
  labelDisplay.size = 20;
  labelDisplay.textColor = 7368816;
  labelDisplay.textAlign = "center";
  labelDisplay.verticalAlign = "middle";
  labelDisplay.fontFamily = "Tahoma";
  _group1.elementsContent = [_image3, labelDisplay];
  skin.elementsContent = [_group1];
  skin.states = [new State5("up"), new State5("down", [new SetProperty5("_image3", "alpha", 0.7)]), new State5("disabled", [new SetProperty5("_image3", "alpha", 0.5)]), new State5("upAndSelected", [new SetProperty5("_image3", "source", "radiobutton_select_up_png")]), new State5("downAndSelected", [new SetProperty5("_image3", "source", "radiobutton_select_down_png")]), new State5("disabledAndSelected", [new SetProperty5("_image3", "source", "radiobutton_select_disabled_png")])];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin8.ts
import { Label as Label7, Skin as Skin12 } from "@blakron/ui";
function createLabelSkin() {
  const skin = new Skin12();
  skin.skinParts = ["labelDisplay"];
  const labelDisplay = new Label7();
  skin.labelDisplay = labelDisplay;
  labelDisplay.percentWidth = 100;
  labelDisplay.percentHeight = 100;
  labelDisplay.textColor = 14673641;
  labelDisplay.size = 14;
  skin.elementsContent = [labelDisplay];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin13.ts
import { HScrollBar, Skin as Skin13, VScrollBar } from "@blakron/ui";
function createScrollerSkin() {
  const skin = new Skin13();
  skin.skinParts = ["horizontalScrollBar", "verticalScrollBar"];
  skin.minWidth = 20;
  skin.minHeight = 20;
  const horizontalScrollBar = new HScrollBar();
  skin.horizontalScrollBar = horizontalScrollBar;
  horizontalScrollBar.left = 0;
  horizontalScrollBar.right = 12;
  horizontalScrollBar.bottom = 0;
  horizontalScrollBar.height = 12;
  horizontalScrollBar.autoVisibility = false;
  horizontalScrollBar.visible = false;
  const verticalScrollBar = new VScrollBar();
  skin.verticalScrollBar = verticalScrollBar;
  verticalScrollBar.top = 0;
  verticalScrollBar.right = 0;
  verticalScrollBar.bottom = 12;
  verticalScrollBar.width = 12;
  verticalScrollBar.autoVisibility = false;
  verticalScrollBar.visible = false;
  skin.elementsContent = [horizontalScrollBar, verticalScrollBar];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin14.ts
import { DataGroup as DataGroup2, Rect as Rect3, Skin as Skin14 } from "@blakron/ui";
function createTabBarSkin() {
  const skin = new Skin14();
  skin.skinParts = ["dataGroup"];
  skin.minWidth = 100;
  skin.minHeight = 40;
  const _rect1 = new Rect3();
  _rect1.percentWidth = 100;
  _rect1.percentHeight = 100;
  _rect1.fillColor = 1450302;
  const dataGroup = new DataGroup2();
  skin.dataGroup = dataGroup;
  dataGroup.percentWidth = 100;
  dataGroup.percentHeight = 100;
  skin.elementsContent = [_rect1, dataGroup];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin11.ts
import { Image as Image9, Label as Label8, Skin as Skin15 } from "@blakron/ui";
import { Rectangle as Rectangle6 } from "@blakron/core";
function createProgressBarSkin() {
  const skin = new Skin15();
  skin.skinParts = ["thumb", "labelDisplay"];
  skin.minWidth = 30;
  skin.minHeight = 18;
  const _image1 = new Image9();
  _image1.source = "track_pb_png";
  _image1.scale9Grid = new Rectangle6(1, 1, 4, 4);
  _image1.percentWidth = 100;
  _image1.percentHeight = 100;
  _image1.verticalCenter = 0;
  const thumb = new Image9();
  skin.thumb = thumb;
  thumb.source = "thumb_pb_png";
  thumb.scale9Grid = new Rectangle6(1, 1, 4, 4);
  thumb.percentWidth = 100;
  thumb.percentHeight = 100;
  const labelDisplay = new Label8();
  skin.labelDisplay = labelDisplay;
  labelDisplay.textAlign = "center";
  labelDisplay.verticalAlign = "middle";
  labelDisplay.size = 15;
  labelDisplay.fontFamily = "Tahoma";
  labelDisplay.textColor = 7368816;
  labelDisplay.horizontalCenter = 0;
  labelDisplay.verticalCenter = 0;
  skin.elementsContent = [_image1, thumb, labelDisplay];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin17.ts
import { Image as Image10, SetProperty as SetProperty6, Skin as Skin16, State as State6 } from "@blakron/ui";
function createToggleSwitchSkin() {
  const skin = new Skin16();
  const _image1 = new Image10();
  skin._image1 = _image1;
  _image1.source = "on_png";
  const _image2 = new Image10();
  skin._image2 = _image2;
  _image2.source = "handle_png";
  _image2.horizontalCenter = -18;
  _image2.verticalCenter = 0;
  skin.elementsContent = [_image1, _image2];
  skin.states = [new State6("up", [new SetProperty6("_image1", "source", "off_png")]), new State6("down", [new SetProperty6("_image1", "source", "off_png")]), new State6("disabled", [new SetProperty6("_image1", "source", "off_png")]), new State6("upAndSelected", [new SetProperty6("_image2", "horizontalCenter", 18)]), new State6("downAndSelected", [new SetProperty6("_image2", "horizontalCenter", 18)]), new State6("disabledAndSelected", [new SetProperty6("_image2", "horizontalCenter", 18)])];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin16.ts
import { Label as Label9, Rect as Rect4, SetProperty as SetProperty7, Skin as Skin17, State as State7 } from "@blakron/ui";
function createToggleButtonSkin() {
  const skin = new Skin17();
  skin.skinParts = ["bg", "labelDisplay"];
  skin.minWidth = 100;
  skin.minHeight = 50;
  const bg = new Rect4();
  skin.bg = bg;
  bg.percentWidth = 100;
  bg.percentHeight = 100;
  bg.fillColor = 6516338;
  bg.strokeColor = 4871257;
  bg.strokeWeight = 1;
  const labelDisplay = new Label9();
  skin.labelDisplay = labelDisplay;
  labelDisplay.left = 8;
  labelDisplay.right = 8;
  labelDisplay.top = 8;
  labelDisplay.bottom = 8;
  labelDisplay.textAlign = "center";
  labelDisplay.verticalAlign = "middle";
  labelDisplay.textColor = 14673641;
  labelDisplay.size = 16;
  skin.elementsContent = [bg, labelDisplay];
  skin.states = [new State7("up"), new State7("down", [new SetProperty7("bg", "fillColor", 4871257)]), new State7("disabled", [new SetProperty7("bg", "fillColor", 2962486), new SetProperty7("labelDisplay", "textColor", 6516338)]), new State7("upAndSelected", [new SetProperty7("bg", "fillColor", 7101671), new SetProperty7("labelDisplay", "textColor", 16777215)]), new State7("downAndSelected", [new SetProperty7("bg", "fillColor", 5917649)]), new State7("disabledAndSelected", [new SetProperty7("bg", "fillColor", 2962486)])];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin18.ts
import { Group as Group5, Skin as Skin18 } from "@blakron/ui";
function createViewStackSkin() {
  const skin = new Skin18();
  skin.skinParts = ["contentGroup"];
  const contentGroup = new Group5();
  skin.contentGroup = contentGroup;
  contentGroup.percentWidth = 100;
  contentGroup.percentHeight = 100;
  skin.elementsContent = [contentGroup];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin15.ts
import { AddItems, EditableText, Label as Label10, Rect as Rect5, SetProperty as SetProperty8, Skin as Skin19, State as State8 } from "@blakron/ui";
function createTextInputSkin() {
  const skin = new Skin19();
  skin.skinParts = ["textDisplay", "promptDisplay"];
  skin.minWidth = 300;
  skin.minHeight = 40;
  const _rect1 = new Rect5();
  skin._rect1 = _rect1;
  _rect1.percentWidth = 100;
  _rect1.percentHeight = 100;
  _rect1.fillColor = 16777215;
  const textDisplay = new EditableText();
  skin.textDisplay = textDisplay;
  textDisplay.left = 10;
  textDisplay.right = 10;
  textDisplay.verticalCenter = 0;
  textDisplay.height = 24;
  textDisplay.verticalAlign = "middle";
  textDisplay.textColor = 0;
  textDisplay.size = 20;
  const promptDisplay = new Label10();
  skin.promptDisplay = promptDisplay;
  promptDisplay.left = 10;
  promptDisplay.right = 10;
  promptDisplay.verticalCenter = 0;
  promptDisplay.height = 24;
  promptDisplay.touchEnabled = false;
  promptDisplay.multiline = false;
  promptDisplay.wordWrap = false;
  promptDisplay.verticalAlign = "middle";
  promptDisplay.textColor = 11119017;
  promptDisplay.size = 20;
  skin.elementsContent = [_rect1, textDisplay];
  skin.states = [new State8("normal"), new State8("disabled", [new SetProperty8("_rect1", "alpha", 0.5), new SetProperty8("textDisplay", "textColor", 16711680)]), new State8("normalWithPrompt", [new AddItems("promptDisplay", "", -1, "elementsContent")]), new State8("disabledWithPrompt", [new AddItems("promptDisplay", "", -1, "elementsContent")])];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin20.ts
import { Image as Image11, Skin as Skin20 } from "@blakron/ui";
import { Rectangle as Rectangle7 } from "@blakron/core";
function createVSliderSkin() {
  const skin = new Skin20();
  skin.skinParts = ["track", "thumb"];
  skin.minWidth = 25;
  skin.minHeight = 30;
  const track = new Image11();
  skin.track = track;
  track.source = "track_png";
  track.scale9Grid = new Rectangle7(1, 1, 4, 4);
  track.width = 7;
  track.percentHeight = 100;
  track.horizontalCenter = 0;
  const thumb = new Image11();
  skin.thumb = thumb;
  thumb.source = "thumb_png";
  thumb.horizontalCenter = 0;
  skin.elementsContent = [track, thumb];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/skin19.ts
import { Image as Image12, Skin as Skin21 } from "@blakron/ui";
import { Rectangle as Rectangle8 } from "@blakron/core";
function createVScrollBarSkin() {
  const skin = new Skin21();
  skin.skinParts = ["thumb"];
  skin.minWidth = 8;
  skin.minHeight = 20;
  const thumb = new Image12();
  skin.thumb = thumb;
  thumb.source = "roundthumb_png";
  thumb.scale9Grid = new Rectangle8(3, 3, 2, 2);
  thumb.width = 8;
  thumb.height = 30;
  thumb.horizontalCenter = 0;
  skin.elementsContent = [thumb];
  return skin;
}

// ../../../../../../../private/var/folders/ww/_9p_clsx4w56dj5lmwty0mhr0000gn/T/blakron-skins-tARp17/index.ts
globalThis["skins.ButtonSkin"] = createButtonSkin;
globalThis["skins.GroupSkin"] = createGroupSkin;
globalThis["skins.HSliderSkin"] = createHSliderSkin;
globalThis["skins.ImageSkin"] = createImageSkin;
globalThis["skins.ItemRendererSkin"] = createItemRendererSkin;
globalThis["skins.ComboBoxSkin"] = createComboBoxSkin;
globalThis["skins.ListSkin"] = createListSkin;
globalThis["skins.CheckBoxSkin"] = createCheckBoxSkin;
globalThis["skins.PanelSkin"] = createPanelSkin;
globalThis["skins.HScrollBarSkin"] = createHScrollBarSkin;
globalThis["skins.RadioButtonSkin"] = createRadioButtonSkin;
globalThis["skins.LabelSkin"] = createLabelSkin;
globalThis["skins.ScrollerSkin"] = createScrollerSkin;
globalThis["skins.TabBarSkin"] = createTabBarSkin;
globalThis["skins.ProgressBarSkin"] = createProgressBarSkin;
globalThis["skins.ToggleSwitchSkin"] = createToggleSwitchSkin;
globalThis["skins.ToggleButtonSkin"] = createToggleButtonSkin;
globalThis["skins.ViewStackSkin"] = createViewStackSkin;
globalThis["skins.TextInputSkin"] = createTextInputSkin;
globalThis["skins.VSliderSkin"] = createVSliderSkin;
globalThis["skins.VScrollBarSkin"] = createVScrollBarSkin;
