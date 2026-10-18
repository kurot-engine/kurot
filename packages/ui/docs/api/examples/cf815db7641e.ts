import { Button, Label, Rect, Skin } from '@kurot/ui';

class AnswerSkin extends Skin {
  public constructor() {
    super();
    const background = new Rect();
    background.width = 160;
    background.height = 48;
    background.fillColor = 0x345678;
    const caption = new Label();
    caption.width = 160;
    caption.height = 48;
    this.skinParts = ['labelDisplay'];
    this.setPart('labelDisplay', caption);
    this.elementsContent = [background, caption];
  }
}
const answer = new Button();
answer.skinName = AnswerSkin;
answer.label = 'Answer';

export {};
