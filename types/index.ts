import {SVGProps} from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

interface CollectionMeta {
  dataType?: string;
}

export type Collection = {
  id: string;
  name: string;
  count: number;
  meta: CollectionMeta;
}

export type UpdateHistory = {
  name: string;
  timestamp: number;
}

export type DataRecord = {
  id: string;
  prompt: string;
  response: string;
  input: string;
  history: string[][];
  creator?: string;
  createdAt: number;
  lastUpdated: number;
  updateHistory: UpdateHistory[];
  collectionId: string;
  dirty?: boolean;

  // for reward modeling
  outputPositive?: string;
  outputNegative?: string;

  // client-only for helper format history from raw text (not actual filed from server).
  rawHistory: string;
}
