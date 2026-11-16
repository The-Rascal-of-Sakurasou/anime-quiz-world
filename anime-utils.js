function hasFamousJapaneseTitle(media){
 const names=[media?.title?.native,media?.title?.english,media?.title?.romaji,...(Array.isArray(media?.synonyms)?media.synonyms:[])];
 return names.some(name=>typeof name==='string'&&/[ぁ-んァ-ヶ]/.test(name));
}
