import { RecordStatusType } from "@/models";
import { SVGProps } from "react";

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
  creatorId?: string;
  createdAt: number;
  lastUpdated: number;
  updateHistory: UpdateHistory[];
  collectionId: string;
  dirty?: boolean;

  // for reward modeling
  outputPositive?: string;
  outputNegative?: string;

  status?: RecordStatusType;

  // client-only for helper format history from raw text (not actual filed from server).
  rawHistory: string;
  meta?: {
    rejectReason?: string;
  }
}

export interface Result<T> {
  result: {
    entries: T[];
    count: number;
  }
}

export interface Statistic {
  today: number;
  thisMonth: number;
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  targets: {
    daily: number;
    monthly: number;
  }
}