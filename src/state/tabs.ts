import type { ParseResult } from '../thrift/types';
import type { IdlMatchResult, StructMatchInfo } from '../thrift/idlSchema';

export type TabState = {
  id: string;
  name: string;
  inputValue: string;
  inputFormat: 'hex' | 'base64';
  parseResult: ParseResult | null;
  buffer: Uint8Array | null;
  selectedStructOverride: string | null;
  structMatches: StructMatchInfo[];
  idlMatch: IdlMatchResult | null;
  useIdl: boolean;
};

export const createTab = (id: string, name: string): TabState => ({
  id,
  name,
  inputValue: '',
  inputFormat: 'hex',
  parseResult: null,
  buffer: null,
  selectedStructOverride: null,
  structMatches: [],
  idlMatch: null,
  useIdl: false,
});

export const updateTabList = (
  tabs: TabState[],
  tabId: string,
  updater: (tab: TabState) => TabState
) => tabs.map((tab) => (tab.id === tabId ? updater(tab) : tab));

