import { editorInfoField } from "obsidian";
import { EditorState, StateEffect, StateEffectType } from "@codemirror/state";
import type Banner from "src/banner/Banner.svelte";

export const leafBannerMap: Record<string, Maybe<Banner>> = {};

export const openNoteEffect = StateEffect.define<Maybe<Banner>>();
export const upsertBannerEffect = StateEffect.define<BannerMetadata>();
export const removeBannerEffect = StateEffect.define();
export const assignBannerEffect = StateEffect.define<Banner>();
const bannerEffects = [upsertBannerEffect, removeBannerEffect, openNoteEffect];

export const hasEffect = (effects: readonly StateEffect<any>[], target: StateEffectType<any>) => effects.some((e) => e.is(target));

export const isBannerEffect = (effects: readonly StateEffect<any>[]) => (
  // effects.some((e) => bannerEffects.some((b) => e.is(b as StateEffectType<any>)))
  bannerEffects.some((b) => hasEffect(effects, b))
);

export const setBannerInMap = (state: EditorState, banner?: Maybe<Banner>) => {
  const { leaf } = state.field(editorInfoField);
  leafBannerMap[leaf.id] = banner;
}