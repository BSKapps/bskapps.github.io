-- @description BSK: RESET VOLUME, PAN AND OUTPUTS (all tracks)
-- @author BSK
-- @version 1.0
-- @about Asks first (OK/Cancel). Every track: fader to 0 dB and pan to centre, and every hardware output back to 0 dB and centre. Every item and take back to 0 dB, take pan to centre. Track selection is left as it was. Track sends and the master are left alone. Does nothing while recording, and says it failed without the SWS extension. One undo.

local RESET_VOL_PAN = "_XENAKIOS_RESETTRACKVOLANDPAN1"

if reaper.GetPlayState() & 4 == 4 then
  reaper.ShowMessageBox("Failed to reset: REAPER is recording.\n\nStop first, then reset.", "Reset Volume, Pan and Outputs", 0)
  return
end

local cmd = reaper.NamedCommandLookup(RESET_VOL_PAN)
if cmd == 0 then
  reaper.ShowMessageBox("Failed to reset: the SWS extension is not installed.\n\nInstall SWS, then reset again.", "Reset Volume, Pan and Outputs", 0)
  return
end

local answer = reaper.ShowMessageBox("Reset every track?\n\nFaders to 0 dB, pan to centre, every hardware output to 0 dB and centre, and every item and take to 0 dB.", "Reset Volume, Pan and Outputs", 1)
if answer ~= 1 then return end

reaper.Undo_BeginBlock()
reaper.PreventUIRefresh(1)

local count = reaper.CountTracks(0)
local wasSelected = {}
for t = 0, count - 1 do
  local track = reaper.GetTrack(0, t)
  wasSelected[t] = reaper.IsTrackSelected(track)
  reaper.SetTrackSelected(track, true)
end

reaper.Main_OnCommand(cmd, 0)

for t = 0, count - 1 do
  local track = reaper.GetTrack(0, t)
  for s = 0, reaper.GetTrackNumSends(track, 1) - 1 do
    reaper.SetTrackSendInfo_Value(track, 1, s, "D_VOL", 1.0)
    reaper.SetTrackSendInfo_Value(track, 1, s, "D_PAN", 0.0)
  end
  reaper.SetTrackSelected(track, wasSelected[t])
end

for i = 0, reaper.CountMediaItems(0) - 1 do
  local item = reaper.GetMediaItem(0, i)
  reaper.SetMediaItemInfo_Value(item, "D_VOL", 1.0)
  for k = 0, reaper.CountTakes(item) - 1 do
    local take = reaper.GetTake(item, k)
    if take then
      local vol = reaper.GetMediaItemTakeInfo_Value(take, "D_VOL")
      reaper.SetMediaItemTakeInfo_Value(take, "D_VOL", vol < 0 and -1.0 or 1.0)
      reaper.SetMediaItemTakeInfo_Value(take, "D_PAN", 0.0)
    end
  end
end

reaper.PreventUIRefresh(-1)
reaper.UpdateArrange()
reaper.Undo_EndBlock("Reset volume, pan and outputs", 5)
