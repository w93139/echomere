declare module "lunar-javascript" {
  interface LunarDate {
    getYearInGanZhiExact(): string;
    getMonthInGanZhiExact(): string;
    getDayInGanZhiExact(): string;
    getTimeInGanZhi(): string;
    getDayGanExact(): string;
    getDayZhiExact(): string;
    getBaZiShiShenGan(): string[];
    getBaZiShiShenZhi(): string[];
    getBaZiNaYin(): string[];
    getYearInChinese(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearInGanZhiByLiChun(): string;
    getYearGanByLiChun(): string;
    getYearZhiByLiChun(): string;
    getMonthInGanZhi(): string;
    getDayInGanZhi(): string;
    getDayGan(): string;
  }

  interface SolarDate {
    getLunar(): LunarDate;
  }

  export const Solar: {
    fromYmd(year: number, month: number, day: number): SolarDate;
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number
    ): SolarDate;
  };
}
