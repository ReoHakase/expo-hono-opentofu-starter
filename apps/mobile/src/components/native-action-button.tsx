import type { ComponentProps } from 'react';

import { Button, Icon, Row, Spacer, Text } from '@expo/ui';

import { iconSize } from '@/theme/metrics';

export function NativeActionButton({
  label,
  icon,
  fullWidth = false,
  ...button
}: Pick<ComponentProps<typeof Button>, 'disabled' | 'onPress' | 'variant'> & {
  label: string;
  icon: ComponentProps<typeof Icon>['name'];
  fullWidth?: boolean;
}) {
  const style = fullWidth ? { width: '100%' as const } : {};
  return (
    <Button {...button} style={style}>
      <Row alignment="center" spacing={8} style={style}>
        {fullWidth ? <Spacer flexible /> : null}
        <Icon name={icon} size={iconSize} />
        <Text textStyle={{ textAlign: 'center' }}>{label}</Text>
        {fullWidth ? <Spacer flexible /> : null}
      </Row>
    </Button>
  );
}
