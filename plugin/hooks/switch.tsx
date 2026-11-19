import type { ClientModule } from 'claude-code'

// 누르면 post 로 알리고 register.tsx ui.message 훅이 지금 값을 뒤집어 새 props 를 돌려준다
type SwitchProps = { on: boolean; disabled: boolean }

const Switch: ClientModule<SwitchProps> = (p, surface) => {
  const { Box, Text } = surface.elements
  const isOn = p.on === true
  const isOff = p.disabled === true
  const press = () => {
    if (!isOff) surface.post({ toggle: true, on: !isOn })
  }
  surface.onPointer(e => {
    if (e.type === 'up' && (e.button === undefined || e.button === 'left')) press()
  })
  surface.onKey(e => {
    if (e.key === 'return' || e.key === ' ') press()
  })
  const track = isOn ? (isOff ? 'rgba(42,120,214,0.4)' : '#2a78d6') : isOff ? 'rgba(128,128,128,0.18)' : 'rgba(128,128,128,0.5)'
  const knob = isOff ? 'rgba(255,255,255,0.55)' : '#ffffff'
  return (
    <Box width="100%" justifyContent="flex-end">
      <Box width={4.2} height={1} borderStyle="round" borderColor={track} backgroundColor={track} justifyContent={isOn ? 'flex-end' : 'flex-start'} alignItems="center" paddingX={0} paddingY={0}>
        <Text color={knob}>⬤</Text>
      </Box>
    </Box>
  )
}

export default Switch
