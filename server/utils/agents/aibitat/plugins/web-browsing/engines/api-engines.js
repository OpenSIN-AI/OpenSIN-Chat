// SPDX-License-Identifier: MIT
// Search engine implementations that use HTTP APIs (SerpApi, SearchApi, Serper.dev, Tavily, Exa, Perplexity)
// Split from web-browsing.js as part of issue #528 — God-File reduction.

const WEB_FETCH_TIMEOUT_MS = 30_000;

/**
 * API-based search engine implementations.
 * Each method is designed to be mixed into the web-browsing aibitat function object,
 * so `this` refers to the function context (with this.super, this.caller, etc.).
 */
const apiEngines = {
  /**
   * Use SerpApi
   * SerpApi supports dozens of search engines across the major platforms including Google, DuckDuckGo, Bing, eBay, Amazon, Baidu, Yandex, and more.
   * https://serpapi.com/
   */
  _serpApi: async function (query) {
    if (!process.env.AGENT_SERPAPI_API_KEY) {
      this.super.introspect(
        `${this.caller}: I can't use SerpApi searching because the user has not defined the required API key.\nVisit: https://serpapi.com/ to create the API key for free.`
      );
      return `Search is disabled and no content was found. This functionality is disabled because the user has not set it up yet.`;
    }

    this.super.introspect(
      `${this.caller}: Using SerpApi to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`
    );

    const engine = process.env.AGENT_SERPAPI_ENGINE;
    const queryParamKey = engine === 'amazon' ? 'k' : 'q';

    const params = new URLSearchParams({
      engine: engine,
      [queryParamKey]: query,
      api_key: process.env.AGENT_SERPAPI_API_KEY,
    });

    const url = `https://serpapi.com/search.json?${params.toString()}`;
    const { response, error } = await fetch(url, {
      method: 'GET',
      headers: {},
      signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error(
          `${res.status} - ${res.statusText}. params: ${JSON.stringify({ auth: this.middleTruncate(process.env.AGENT_SERPAPI_API_KEY, 5), q: query })}`
        );
      })
      .then((data) => {
        return { response: data, error: null };
      })
      .catch((e) => {
        this.super.handlerProps.log(`SerpApi Error: ${e.message}`);
        return { response: null, error: e.message };
      });
    if (error) return `There was an error searching for content. ${error}`;

    const data = [];

    switch (engine) {
      case 'google':
        if (response.hasOwnProperty('knowledge_graph'))
          data.push(response.knowledge_graph);
        if (response.hasOwnProperty('answer_box'))
          data.push(response.answer_box);
        response.organic_results?.forEach((searchResult) => {
          const { title, link, snippet } = searchResult;
          data.push({ title, link, snippet });
        });
        response.local_results?.forEach((searchResult) => {
          const {
            title,
            rating,
            reviews,
            description,
            address,
            website,
            extensions,
          } = searchResult;
          data.push({
            title,
            rating,
            reviews,
            description,
            address,
            website,
            extensions,
          });
        });
        break;
      case 'google_maps':
        response.local_results?.slice(0, 10).forEach((searchResult) => {
          const {
            title,
            rating,
            reviews,
            description,
            address,
            website,
            extensions,
          } = searchResult;
          data.push({
            title,
            rating,
            reviews,
            description,
            address,
            website,
            extensions,
          });
        });
        break;
      case 'google_images_light':
        response.images_results?.slice(0, 10).forEach((searchResult) => {
          const { title, source, link, thumbnail } = searchResult;
          data.push({ title, source, link, thumbnail });
        });
        break;
      case 'google_shopping_light':
        response.shopping_results?.slice(0, 10).forEach((searchResult) => {
          const {
            title,
            source,
            price,
            rating,
            reviews,
            snippet,
            thumbnail,
            product_link,
          } = searchResult;
          data.push({
            title,
            source,
            price,
            rating,
            reviews,
            snippet,
            thumbnail,
            product_link,
          });
        });
        break;
      case 'google_news_light':
        response.news_results?.slice(0, 10).forEach((searchResult) => {
          const { title, link, source, thumbnail, snippet, date } =
            searchResult;
          data.push({ title, link, source, thumbnail, snippet, date });
        });
        break;
      case 'google_jobs':
        response.jobs_results?.forEach((searchResult) => {
          const {
            title,
            company_name,
            location,
            description,
            apply_options,
            extensions,
          } = searchResult;
          data.push({
            title,
            company_name,
            location,
            description,
            apply_options,
            extensions,
          });
        });
        break;
      case 'google_patents':
        response.organic_results?.forEach((searchResult) => {
          const {
            title,
            patent_link,
            snippet,
            inventor,
            assignee,
            publication_number,
          } = searchResult;
          data.push({
            title,
            patent_link,
            snippet,
            inventor,
            assignee,
            publication_number,
          });
        });
        break;
      case 'google_scholar':
        response.organic_results?.forEach((searchResult) => {
          const { title, link, snippet, publication_info } = searchResult;
          data.push({ title, link, snippet, publication_info });
        });
        break;
      case 'baidu':
        if (response.hasOwnProperty('answer_box'))
          data.push(response.answer_box);
        response.organic_results?.forEach((searchResult) => {
          const { title, link, snippet } = searchResult;
          data.push({ title, link, snippet });
        });
        break;
      case 'amazon':
        response.organic_results?.slice(0, 10).forEach((searchResult) => {
          const { title, rating, reviews, price, link_clean, thumbnail } =
            searchResult;
          data.push({ title, rating, reviews, price, link_clean, thumbnail });
        });
    }

    if (data.length === 0)
      return `No information was found online for the search query.`;

    this.reportSearchResultsCitations(data);
    const result = JSON.stringify(data);
    this.super.introspect(
      `${this.caller}: I found ${data.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`
    );
    return result;
  },

  /**
   * Use SearchApi
   * SearchApi supports multiple search engines like Google Search, Bing Search, Baidu Search, Google News, YouTube, and many more.
   * https://www.searchapi.io/
   */
  _searchApi: async function (query) {
    if (!process.env.AGENT_SEARCHAPI_API_KEY) {
      this.super.introspect(
        `${this.caller}: I can't use SearchApi searching because the user has not defined the required API key.\nVisit: https://www.searchapi.io/ to create the API key for free.`
      );
      return `Search is disabled and no content was found. This functionality is disabled because the user has not set it up yet.`;
    }

    this.super.introspect(
      `${this.caller}: Using SearchApi to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`
    );

    const engine = process.env.AGENT_SEARCHAPI_ENGINE;
    const params = new URLSearchParams({ engine: engine, q: query });

    const url = `https://www.searchapi.io/api/v1/search?${params.toString()}`;
    const { response, error } = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.AGENT_SEARCHAPI_API_KEY}`,
        'Content-Type': 'application/json',
        'X-SearchApi-Source': 'OpenSIN Chat',
      },
      signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error(
          `${res.status} - ${res.statusText}. params: ${JSON.stringify({ auth: this.middleTruncate(process.env.AGENT_SEARCHAPI_API_KEY, 5), q: query })}`
        );
      })
      .then((data) => {
        return { response: data, error: null };
      })
      .catch((e) => {
        this.super.handlerProps.log(`SearchApi Error: ${e.message}`);
        return { response: null, error: e.message };
      });
    if (error) return `There was an error searching for content. ${error}`;

    const data = [];
    if (response.hasOwnProperty('knowledge_graph'))
      data.push(response.knowledge_graph?.description);
    if (response.hasOwnProperty('answer_box'))
      data.push(response.answer_box?.answer);
    response.organic_results?.forEach((searchResult) => {
      const { title, link, snippet } = searchResult;
      data.push({ title, link, snippet });
    });

    if (data.length === 0)
      return `No information was found online for the search query.`;

    this.reportSearchResultsCitations(data);
    const result = JSON.stringify(data);
    this.super.introspect(
      `${this.caller}: I found ${data.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`
    );
    return result;
  },

  /**
   * Use Serper.dev
   * Free to set up, easy to use, 2,500 calls for free one-time
   * https://serper.dev
   */
  _serperDotDev: async function (query) {
    if (!process.env.AGENT_SERPER_DEV_KEY) {
      this.super.introspect(
        `${this.caller}: I can't use Serper.dev searching because the user has not defined the required API key.\nVisit: https://serper.dev to create the API key for free.`
      );
      return `Search is disabled and no content was found. This functionality is disabled because the user has not set it up yet.`;
    }

    this.super.introspect(
      `${this.caller}: Using Serper.dev to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`
    );
    const { response, error } = await fetch(
      'https://google.serper.dev/search',
      {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.AGENT_SERPER_DEV_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query }),
        redirect: 'follow',
        signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
      }
    )
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error(
          `${res.status} - ${res.statusText}. params: ${JSON.stringify({ auth: this.middleTruncate(process.env.AGENT_SERPER_DEV_KEY, 5), q: query })}`
        );
      })
      .then((data) => {
        return { response: data, error: null };
      })
      .catch((e) => {
        this.super.handlerProps.log(`Serper.dev Error: ${e.message}`);
        return { response: null, error: e.message };
      });
    if (error) return `There was an error searching for content. ${error}`;

    const data = [];
    if (response.hasOwnProperty('knowledgeGraph'))
      data.push(response.knowledgeGraph);
    response.organic?.forEach((searchResult) => {
      const { title, link, snippet } = searchResult;
      data.push({ title, link, snippet });
    });

    if (data.length === 0)
      return `No information was found online for the search query.`;

    this.reportSearchResultsCitations(data);
    const result = JSON.stringify(data);
    this.super.introspect(
      `${this.caller}: I found ${data.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`
    );
    return result;
  },

  /**
   * Use Tavily Search
   * https://tavily.com/
   */
  _tavilySearch: async function (query) {
    if (!process.env.AGENT_TAVILY_API_KEY) {
      this.super.introspect(
        `${this.caller}: I can't use Tavily searching because the user has not defined the required API key.\nVisit: https://tavily.com/ to create the API key.`
      );
      return `Search is disabled and no content was found. This functionality is disabled because the user has not set it up yet.`;
    }

    this.super.introspect(
      `${this.caller}: Using Tavily to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`
    );

    const url = 'https://api.tavily.com/search';
    const { response, error } = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.AGENT_TAVILY_API_KEY,
        query: query,
      }),
      signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error(
          `${res.status} - ${res.statusText}. params: ${JSON.stringify({ auth: this.middleTruncate(process.env.AGENT_TAVILY_API_KEY, 5), q: query })}`
        );
      })
      .then((data) => {
        return { response: data, error: null };
      })
      .catch((e) => {
        this.super.handlerProps.log(`Tavily Search Error: ${e.message}`);
        return { response: null, error: e.message };
      });

    if (error) return `There was an error searching for content. ${error}`;

    const data = [];
    response.results?.forEach((searchResult) => {
      const { title, url, content } = searchResult;
      data.push({ title, link: url, snippet: content });
    });

    if (data.length === 0)
      return `No information was found online for the search query.`;

    this.reportSearchResultsCitations(data);
    const result = JSON.stringify(data);
    this.super.introspect(
      `${this.caller}: I found ${data.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`
    );
    return result;
  },

  /**
   * Use Exa Search
   * https://exa.ai
   */
  _exaSearch: async function (query) {
    if (!process.env.AGENT_EXA_API_KEY) {
      this.super.introspect(
        `${this.caller}: I can't use Exa searching because the user has not defined the required API key.\nVisit: https://exa.ai to create the API key.`
      );
      return `Search is disabled and no content was found. This functionality is disabled because the user has not set it up yet.`;
    }

    this.super.introspect(
      `${this.caller}: Using Exa to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`
    );

    const url = 'https://api.exa.ai/search';
    const { response, error } = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.AGENT_EXA_API_KEY,
      },
      body: JSON.stringify({
        query: query,
        type: 'auto',
        numResults: 10,
        contents: { text: true },
      }),
      signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error(
          `${res.status} - ${res.statusText}. params: ${JSON.stringify({ auth: this.middleTruncate(process.env.AGENT_EXA_API_KEY, 5), q: query })}`
        );
      })
      .then((data) => {
        return { response: data, error: null };
      })
      .catch((e) => {
        this.super.handlerProps.log(`Exa Search Error: ${e.message}`);
        return { response: null, error: e.message };
      });

    if (error) return `There was an error searching for content. ${error}`;

    const data = [];
    response.results?.forEach((searchResult) => {
      const { title, url, text, publishedDate } = searchResult;
      data.push({ title, link: url, snippet: text, publishedDate });
    });

    if (data.length === 0)
      return `No information was found online for the search query.`;

    this.reportSearchResultsCitations(data);
    const result = JSON.stringify(data);
    this.super.introspect(
      `${this.caller}: I found ${data.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`
    );
    return result;
  },

  /**
   * Use Perplexity Search
   * https://console.perplexity.ai
   */
  _perplexitySearch: async function (query) {
    if (!process.env.AGENT_PERPLEXITY_API_KEY) {
      this.super.introspect(
        `${this.caller}: I can't use Perplexity searching because the user has not defined the required API key.\nVisit: [https://console.perplexity.ai](https://console.perplexity.ai) to create the API key.`
      );
      return `Search is disabled and no content was found. This functionality is disabled because the user has not set it up yet.`;
    }

    this.super.introspect(
      `${this.caller}: Using Perplexity to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`
    );

    const { response, error } = await fetch(
      'https://api.perplexity.ai/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AGENT_PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          query: query,
          max_results: 5,
          max_tokens_per_page: 2048,
        }),
        signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
      }
    )
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error(
          `${res.status} - ${res.statusText}. params: ${JSON.stringify({ auth: this.middleTruncate(process.env.AGENT_PERPLEXITY_API_KEY, 5), q: query })}`
        );
      })
      .then((data) => {
        return { response: data, error: null };
      })
      .catch((e) => {
        this.super.handlerProps.log(`Perplexity Search Error: ${e.message}`);
        return { response: null, error: e.message };
      });

    if (error) return `There was an error searching for content. ${error}`;

    const data = [];
    if (response.results) {
      response.results.forEach((result) => {
        data.push({
          title: result.title,
          link: result.url,
          snippet: result.snippet || '',
        });
      });
    }

    if (data.length === 0)
      return 'No information was found online for the search query.';

    this.reportSearchResultsCitations(data);

    const result = JSON.stringify(data);
    this.super.introspect(
      `${this.caller}: I found ${data.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`
    );

    return result;
  },
};

module.exports = { apiEngines, WEB_FETCH_TIMEOUT_MS };
