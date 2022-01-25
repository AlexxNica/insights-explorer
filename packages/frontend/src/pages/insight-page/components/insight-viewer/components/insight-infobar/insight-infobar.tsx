/**
 * Copyright 2022 Expedia, Inc.
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

import {
  Collapse,
  Flex,
  HStack,
  IconButton,
  Stack,
  StackProps,
  Tag,
  TagLabel,
  Text,
  VStack,
  useDisclosure,
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import { DateTime } from 'luxon';

import { InsightAuthor } from '../../../../../../components/insight-author/insight-author';
import { InsightTag } from '../../../../../../components/insight-tag/insight-tag';
import { Link } from '../../../../../../components/link/link';
import { SidebarHeading } from '../../../../../../components/sidebar-heading/sidebar-heading';
import { TeamTag } from '../../../../../../components/team-tag/team-tag';
import { Insight } from '../../../../../../models/generated/graphql';
import { formatDateIntl, formatRelativeIntl } from '../../../../../../shared/date-utils';
import { iconFactoryAs } from '../../../../../../shared/icon-factory';
import { GitHubButton } from '../github-button/github-button';
import { ShareMenu } from '../share-menu/share-menu';

export const InsightInfobar = ({ insight, ...props }: { insight: Insight } & StackProps) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });

  return (
    <VStack align="stretch" p="0.5rem" {...props}>
      <Flex flexDirection="row" align="flex-start" justify="space-between">
        <Stack spacing="0.25rem" direction={{ base: 'column', md: 'row' }} align="flex-start" justify="flex-start">
          <IconButton
            aria-label="Expand/collapse"
            icon={isOpen ? iconFactoryAs('chevronUp') : iconFactoryAs('chevronDown')}
            variant="ghost"
            size="sm"
            onClick={onToggle}
            title={isOpen ? 'Collapse this section' : 'Expand this section'}
          />
          <Wrap spacing="0.25rem" shouldWrapChildren={true} align="center" pt="0.25rem">
            {insight.metadata?.team && <TeamTag team={insight.metadata.team} size="md" />}

            {insight.authors.edges.map(({ node: author }) => (
              <InsightAuthor key={author.userName} author={author} size="md" width="100%" />
            ))}

            {insight.tags?.length > 0 && insight.tags.map((tag) => <InsightTag key={tag} tag={tag} size="md" />)}
          </Wrap>
        </Stack>

        <HStack flexShrink={0}>
          <GitHubButton insight={insight} size="sm" fontSize="1rem" mr="0.5rem" />
          <ShareMenu insight={insight} size="sm" fontSize="1rem" />
        </HStack>
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <VStack spacing="1rem" align="stretch" mt="0.5rem" ml={{ base: 0, md: '2.5rem' }}>
          <Wrap align="center" spacing="0.5rem">
            {insight.metadata?.publishedDate != null && (
              <WrapItem alignItems="baseline">
                <SidebarHeading mr="0.5rem">Published Date</SidebarHeading>
                <Text fontSize="md">{formatDateIntl(insight.metadata.publishedDate, DateTime.DATE_MED)}</Text>
              </WrapItem>
            )}

            <WrapItem alignItems="baseline">
              <SidebarHeading mr="0.5rem">Last Updated</SidebarHeading>
              <Text fontSize="md">
                {formatDateIntl(insight.updatedAt, DateTime.DATETIME_MED)} ({formatRelativeIntl(insight.updatedAt)})
              </Text>
            </WrapItem>

            <WrapItem alignItems="baseline">
              <SidebarHeading mr="0.5rem">Created</SidebarHeading>
              <Text fontSize="md">
                {formatDateIntl(insight.createdAt, DateTime.DATETIME_MED)} ({formatRelativeIntl(insight.createdAt)})
              </Text>
            </WrapItem>
          </Wrap>

          {insight.files && insight.files.length > 0 && (
            <Wrap align="center" spacing="0.5rem" shouldWrapChildren={true}>
              <SidebarHeading mr="0.5rem">Files</SidebarHeading>
              {insight.files.map((file) => {
                return (
                  <Link to={`/${insight.itemType}/${insight.fullName}/files/${file.path}`} key={file.id}>
                    <Tag rounded="full">
                      <TagLabel>{file.path}</TagLabel>
                    </Tag>
                  </Link>
                );
              })}
            </Wrap>
          )}
        </VStack>
      </Collapse>
    </VStack>
  );
};