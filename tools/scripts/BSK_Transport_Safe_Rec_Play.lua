-- @description BSK Transport: Safe Rec Play (only if stopped or paused, never toggles)
-- @author BSK
-- @version 3.1
-- @about Starts playback only if stopped or paused, and says it failed when playback has not started a second later because the audio device is not running. Does nothing if already playing or recording.

if reaper.set_action_options then reaper.set_action_options(3) end
reaper.defer(function() end)

local state = reaper.GetPlayState()

local started = state == 0 or state == 2
if started then
  reaper.Main_OnCommand(1007, 0) -- Transport: Play
end

reaper.TrackList_AdjustWindows(false)

if started then
  local CONFIRM_FOR = 1
  local pressed = reaper.time_precise()
  local function confirm()
    if reaper.GetPlayState() & 1 == 1 then return end
    if reaper.time_precise() - pressed < CONFIRM_FOR then
      reaper.defer(confirm)
    elseif reaper.Audio_IsRunning() == 0 then
      reaper.ShowMessageBox("Failed to start playback: the audio device is not running.\n\nTurn on the audio interface, or pick it in Preferences > Audio > Device.", "Safe Rec Play", 0)
    end
  end
  reaper.defer(confirm)
end
