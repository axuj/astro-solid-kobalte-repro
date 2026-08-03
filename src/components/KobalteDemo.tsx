import * as TooltipPrimitive from '@kobalte/core/tooltip'

export default function KobalteDemo() {
  return (
    <TooltipPrimitive.Root gutter={4}>
      <TooltipPrimitive.Trigger>Hover me</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content>
          <p>Tooltip content</p>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
