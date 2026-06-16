-- @description BSK Transport: Safe Rec Pause/Unpause (ignore if stopped or actively recording)
-- @author BSK
-- @version 4.1
-- @about Pauses if playing, unpauses if paused (including paused recording). Does nothing if stopped or actively recording.

local state = reaper.GetPlayState()

if state == 1 or state == 2 or state == 6 then
  reaper.Main_OnCommand(1008, 0) -- Transport: Pause (toggles)
end

reaper.TrackList_AdjustWindows(false)
