import { createMemo, createSignal, on } from "solid-js";
import { fuzzySearch } from "~/features/LogViewer/Plot/SearchSeries/FuzzySearch";

export function createSearchSeries(header: string[]) {
  const [searchInput, setSearchInput] = createSignal<string>("");
  const defaultLegnedIndex = header.map((_, i) => i);

  const legendIndex = createMemo(
    on(
      () => searchInput(),
      (searchInputValue) => {
        if (searchInputValue.length < 1) return defaultLegnedIndex;
        const parseSearchResults: string[] = fuzzySearch(
          searchInputValue,
          header,
        );
        const searchedHeaderIndex = parseSearchResults.map((str) =>
          header.indexOf(str),
        );
        return searchedHeaderIndex;
      },
    ),
  );

  return {
    searchInput,
    setSearchInput,
    legendIndex,
  };
}
