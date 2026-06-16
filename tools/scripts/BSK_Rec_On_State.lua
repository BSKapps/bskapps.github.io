-- @description BSK Rec On State (lights a toolbar button while recording)
-- @author BSK
-- @version 1.0
-- @about Keeps this action's toggle state on while REAPER is recording, so a toolbar button assigned to it shows its _on icon during recording. Assign your button to this script and run it once (or set it as a startup action).

local _, _, sec, cmd = reaper.get_action_context()

local function tick()
  local recording = (reaper.GetPlayState() & 4) ~= 0
  reaper.SetToggleCommandState(sec, cmd, recording and 1 or 0)
  reaper.RefreshToolbar2(sec, cmd)
  reaper.defer(tick)
end

reaper.atexit(function()
  reaper.SetToggleCommandState(sec, cmd, 0)
  reaper.RefreshToolbar2(sec, cmd)
end)

tick()
