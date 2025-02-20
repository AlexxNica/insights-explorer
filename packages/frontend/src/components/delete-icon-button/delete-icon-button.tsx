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

import { Tooltip, IconButton, IconButtonProps } from '@chakra-ui/react';

import { iconFactoryAs } from '../../shared/icon-factory';

interface Props {
  isDisabled?: boolean;
  isLoading?: boolean;
  label?: string;
  onClick?: () => void;
}
export const DeleteIconButton = ({
  isDisabled = false,
  isLoading = false,
  label = 'Delete',
  onClick,
  ...iconButtonProps
}: Props & Partial<IconButtonProps>) => {
  return (
    <Tooltip label={label} aria-label={label}>
      <IconButton
        variant="ghost"
        size="sm"
        _hover={{ backgroundColor: 'aurora.100' }}
        aria-label={label}
        icon={iconFactoryAs('trash')}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) {
            onClick();
          }
        }}
        isDisabled={isDisabled}
        isLoading={isLoading}
        {...iconButtonProps}
      />
    </Tooltip>
  );
};
