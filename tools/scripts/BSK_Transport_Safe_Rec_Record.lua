-- @description BSK Transport: Safe Rec Record (only if not already recording)
-- @author BSK
-- @version 3.3
-- @about Starts recording only if not already recording, and says it failed when recording has not started a second later because the audio device never started. Then unselects every track, so a fader or mute touched mid-show moves only that track (SAFE REC selects them all to turn monitoring off).

if reaper.set_action_options then reaper.set_action_options(3) end
reaper.defer(function() end)

local state = reaper.GetPlayState()

local started = state & 4 == 0
if started then
  reaper.Main_OnCommand(1013, 0) -- Transport: Record
end

reaper.Main_OnCommand(40297, 0)

reaper.TrackList_AdjustWindows(false)

if started then
  local CONFIRM_FOR = 1
  local pressed = reaper.time_precise()
  local deviceRan = reaper.Audio_IsRunning() ~= 0
  local function confirm()
    if reaper.GetPlayState() & 4 == 4 then return end
    deviceRan = deviceRan or reaper.Audio_IsRunning() ~= 0
    if reaper.time_precise() - pressed < CONFIRM_FOR then
      reaper.defer(confirm)
    elseif not deviceRan then
      reaper.ShowMessageBox("Failed to start recording: the audio device is not running.\n\nTurn on the audio interface, or pick it in Preferences > Audio > Device.", "Safe Rec Record", 0)
    end
  end
  reaper.defer(confirm)
end
