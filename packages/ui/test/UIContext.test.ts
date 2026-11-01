import { describe, expect, it } from 'vitest';
import { Texture, TextField } from '@kurot/core';
import { UIContext, getUIContext } from '../src/kurot/core/UIContext.js';
import { Button } from '../src/kurot/components/Button.js';
import { Label } from '../src/kurot/components/Label.js';
import { Image } from '../src/kurot/components/Image.js';
import { Skin } from '../src/kurot/components/Skin.js';
import { DataGroup } from '../src/kurot/components/DataGroup.js';
import { ArrayCollection } from '../src/kurot/collections/ArrayCollection.js';
import { RadioButton } from '../src/kurot/components/RadioButton.js';

function context(text: string): UIContext {
	return new UIContext({
		fontFamily: text,
		defaults: { Button: 'default' },
		assetAdapter: { getAsset: (_source, callback) => callback(undefined, _source) },
		skins: { default: function () {
			const skin = new Skin();
			skin.elementsContent = [new Label(text)];
			return skin;
		} },
	});
}

describe('UIContext', () => {
	it('isolates equal named radio groups while preserving local mutual exclusion', () => {
		const a = context('first');
		const b = context('second');
		const first = a.run(() => new RadioButton());
		const peer = a.run(() => new RadioButton());
		const other = b.run(() => new RadioButton());
		const global = new RadioButton();
		expect(first.group).toBe(peer.group);
		expect(first.group).not.toBe(other.group);
		expect(first.group).not.toBe(global.group);
		first.selected = true;
		other.selected = true;
		peer.selected = true;
		expect(first.selected).toBe(false);
		expect(peer.selected).toBe(true);
		expect(other.selected).toBe(true);
		global.group = undefined;
	});
	it('keeps simultaneous default, explicit and nested skins and fonts local', () => {
		const font = TextField.default_fontFamily;
		const a = context('lobby');
		const b = context('tentax');
		const first = a.run(() => new Button());
		const second = b.run(() => new Button());
		first.createChildren();
		second.createChildren();
		expect((first.skin?.elementsContent[0] as Label).text).toBe('lobby');
		expect((second.skin?.elementsContent[0] as Label).fontFamily).toBe('tentax');
		second.skinName = undefined;
		second.skinName = 'default';
		expect(getUIContext(second.skin!.elementsContent[0])).toBe(b);
		second.skinName = 'missing';
		expect(second.skin).toBeUndefined();
		expect(TextField.default_fontFamily).toBe(font);
	});

	it('restores construction after errors and isolates delayed list renderer creation', () => {
		const owner = context('game');
		expect(() => owner.run(() => { throw new Error('stop'); })).toThrow('stop');
		expect(getUIContext(new Label())).toBeUndefined();
		const list = owner.run(() => new DataGroup());
		list.itemRendererSkinName = 'default';
		list.dataProvider = new ArrayCollection(['a', 'b']);
		list.validateProperties();
		const renderer = list.getElementAt(0);
		expect(renderer).toBeDefined();
		expect(getUIContext(renderer!)).toBe(owner);
	});

	it('revokes a late asset result without touching a sibling context', () => {
		let reply: ((texture: Texture | undefined, source: string) => void) | undefined;
		const owner = new UIContext({ skins: {}, assetAdapter: { getAsset: (_source, callback) => { reply = callback; } } });
		const image = owner.run(() => new Image('same-name'));
		image.commitProperties();
		owner.dispose();
		reply?.(new Texture(), 'same-name');
		expect(image.bitmap?.texture).toBeUndefined();
		expect(() => owner.run(() => new Button())).toThrow('disposed');
		const other = context('still-alive').run(() => new Button());
		other.createChildren();
		expect(other.skin).toBeDefined();
	});
});
