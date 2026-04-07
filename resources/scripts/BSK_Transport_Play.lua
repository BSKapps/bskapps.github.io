-- @description BSK Transport: Play (only if stopped or paused, never toggles)
-- @author BSK
-- @version 3.0
-- @about Starts playback only if stopped or paused. Does nothing if already playing or recording.

local state = reaper.GetPlayState()

if state == 0 or state == 2 then
  reaper.Main_OnCommand(1007, 0) -- Transport: Play
end

reaper.TrackList_AdjustWindows(false)
