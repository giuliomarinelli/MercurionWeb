export class Helpers {

  static normalizeTitleCase(input: string): string {
    if (!input) return '';

    return input
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(' ');
  }

  static isValidJwt(t: string) {
    return /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2}$/.test(t);
  }


}
