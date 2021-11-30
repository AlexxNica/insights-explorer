/**
 * Copyright 2021 Expedia, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { InsightFileAction } from '../insight-file-action';

export interface IndexedInsightFileConversion {
  mimeType: string;
  path: string;
}

export interface IndexedInsightFile {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  encoding?: string;
  contents?: string;
  hash?: string;
  readonly?: boolean;
  conversions?: IndexedInsightFileConversion[];
}

export interface IndexedInsightFileInput {
  id: string;
  name: string;
  path: string;
  mimeType?: string;
  contents?: string;
  action: InsightFileAction;
  originalPath?: string;
}
