export class GeneralUtils {


    public static getEnumValue<T>(enumType: T, value: string | number): T[keyof T] | undefined {
        return Object.values(enumType as [keyof T]).find(val => val === value) as T[keyof T] | undefined;
    }

    public static getEnumValueFromStringKey<T extends object>(enumType: T, key: string): T[keyof T] | undefined {
        // Verifica se la chiave esiste nell'enum
        if (key in enumType) {
            return enumType[key as keyof T];
        }
        return undefined; // Ritorna undefined se la chiave non è valida
    }
    
    static getEnumKeyByValue<T extends object>(enumType: T, value: T[keyof T] | string): string | undefined {
        // Itera attraverso le chiavi dell'enum
        for (const key in enumType) {
          if (enumType[key as keyof T] === value) {
            return key; // Ritorna la chiave corrispondente al valore
          }
        }
        return undefined; // Ritorna undefined se non trova il valore
      }


    

}
