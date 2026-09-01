export interface PhonePrefixDTO {
  id: number
  iso2: string
  phonecode: string
}

export interface PhonePrefixWithEmojiUrlDTO extends PhonePrefixDTO {
  emojiUrl: string
}

