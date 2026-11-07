import { Backdrop, UILayer } from '@kurot/ui';

export function addBackdrop(layer: UILayer): Backdrop {
    const backdrop = new Backdrop({ blurX: 36, blurY: 36, resolution: 0.5 });
    backdrop.left = backdrop.right = backdrop.top = backdrop.bottom = 0;
    layer.addChildAt(backdrop, 0);
    return backdrop;
}

export {};
