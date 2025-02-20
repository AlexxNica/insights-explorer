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

import { Flex, FlexProps } from '@chakra-ui/react';
import { UseFormReturn } from 'react-hook-form';

import { InsightFile } from '../../../../models/file-tree';
import { Insight } from '../../../../models/generated/graphql';
import { InsightFileTree } from '../../../../shared/file-tree';

import { SidebarFiles } from './sidebar-files';

interface Props {
  insight: Insight;
  draftKey: string;
  isNewInsight: boolean;
  form: UseFormReturn<any>;
  onSelectFile: (f: InsightFile | undefined) => void;
  onFileTreeChanged: (tree: InsightFileTree) => void;
  fileTree: InsightFileTree;
}

export const InsightEditorSidebar = ({
  insight,
  draftKey,
  isNewInsight,
  form,
  onSelectFile,
  onFileTreeChanged,
  fileTree,
  ...flexProps
}: Props & FlexProps) => {
  return (
    <Flex direction="column" {...flexProps}>
      <SidebarFiles
        draftKey={draftKey}
        isNewInsight={isNewInsight}
        tree={fileTree}
        onSelectFile={onSelectFile}
        onTreeChanged={onFileTreeChanged}
      />
    </Flex>
  );
};
