-- @description BSK Transport: Record (only if not already recording)
-- @author BSK
-- @version 3.0
-- @about Starts recording only if not already recording. Does nothing if recording is active.

local state = reaper.GetPlayState()

if state & 4 == 0 then
  reaper.Main_OnCommand(1013, 0) -- Transport: Record
end

reaper.TrackList_AdjustWindows(false)
