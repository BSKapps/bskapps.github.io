-- @description BSK Transport: Pause/Unpause (ignore if stopped or recording)
-- @author BSK
-- @version 4.0
-- @about Pauses if playing, unpauses if paused. Does nothing if stopped or recording.

local state = reaper.GetPlayState()

if state == 1 or state == 2 then
  reaper.Main_OnCommand(1008, 0) -- Transport: Pause (toggles)
end

reaper.TrackList_AdjustWindows(false)
