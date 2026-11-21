import { TanStackDevtools } from '@tanstack/react-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

export function Devtools() {
  return (
    <TanStackDevtools
      config={{
        defaultOpen: false,
        hideUntilHover: true,
        position: 'bottom-right',
        triggerCorner: 'bottom-left',
        triggerMode: 'fixed'
      }}
      plugins={[
        {
          name: 'Tanstack Router',
          render: <TanStackRouterDevtoolsPanel />
        }
      ]}
    />
  );
}
