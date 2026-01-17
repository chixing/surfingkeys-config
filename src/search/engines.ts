import * as utils from '../utils';

export interface SearchEngine {
  alias: string;
  search: string;
  compl?: string;
  callback?: (response: any) => any;
}

export const SEARCH_ENGINES: Record<string, SearchEngine> = {
  amazon: {
    alias: 'a',
    search: 'https://smile.amazon.com/s/?field-keywords=',
    compl: 'https://completion.amazon.com/search/complete?method=completion&mkt=1&search-alias=aps&q=',
    callback: (response: any) => JSON.parse(response.text)[1]
  },
  yelp: {
    alias: 'p',
    search: 'https://www.yelp.com/search?find_desc=',
    compl: 'https://www.yelp.com/search_suggest/v2/prefetch?prefix=',
    callback: (response: any) => {
      const res = JSON.parse(response.text).response;
      return res
        .flatMap((r: any) => r.suggestions.map((s: any) => s.query))
        .filter((v: any, i: number, a: any[]) => a.indexOf(v) === i);
    }
  },
  github: {
    alias: 't',
    search: 'https://github.com/search?q=',
    compl: 'https://api.github.com/search/repositories?sort=stars&order=desc&q=',
    callback: (response: any) => JSON.parse(response.text).items.map((s: any) => {
      const prefix = s.stargazers_count ? `[*${s.stargazers_count}] ` : '';
      return utils.createURLItem(prefix + s.full_name, s.html_url);
    })
  },
  libhunt: { alias: 'l', search: 'https://www.libhunt.com/search?query=' },
  yandex: { alias: 'n', search: 'https://yandex.com/search/?text=' },
  skidrow: { alias: 'k', search: 'https://www.skidrowreloaded.com/?s=' },
  anna: { alias: 'c', search: 'https://www.annas-archive.org/search?q=' },
  libgen: { alias: 'v', search: 'https://libgen.is/search.php?req=' },
  urban: { alias: 'u', search: 'https://www.urbandictionary.com/define.php?term=' },
  archive: { alias: 'r', search: 'https://archive.is/' },
};

export function registerSearchEngines(): void {
  Object.entries(SEARCH_ENGINES).forEach(([name, conf]) => {
    api.addSearchAlias(conf.alias, name, conf.search, 's', conf.compl, conf.callback);
  });
}
