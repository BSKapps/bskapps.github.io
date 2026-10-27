-- @description BSK Auto-name tracks from live hardware input channel names
-- @author BSK
-- @version 1.2
-- @about Reads the hardware input channel name for each track's assigned mono input (a stereo input uses its first channel's name), previews the proposed names, and applies them only after you confirm. Falls back to a message if the interface does not expose labels; use the CSV import in that case. Refuses while recording.

if reaper.GetPlayState() & 4 == 4 then
  reaper.ShowMessageBox("Failed to name tracks: REAPER is recording.\n\nStop first, then name them.", "Auto-name from Inputs", 0)
  return
end

local trackCount = reaper.CountTracks(0)
if trackCount == 0 then
  reaper.ShowMessageBox("No tracks in project.", "Auto-name from Inputs", 0)
  return
end

local proposals = {}
local skipped = 0

for i = 0, trackCount - 1 do
  local tr = reaper.GetTrack(0, i)
  local recin = reaper.GetMediaTrackInfo_Value(tr, "I_RECINPUT")
  local name = nil
  if recin >= 1024 and recin < 2048 then recin = recin - 1024 end
  if recin >= 0 and recin < 1024 then
    name = reaper.GetInputChannelName(math.floor(recin))
  end
  if name then name = name:match("^%s*(.-)%s*$") end
  if name and name ~= "" then
    proposals[#proposals + 1] = { track = tr, number = i + 1, name = name }
  else
    skipped = skipped + 1
  end
end

if #proposals == 0 then
  reaper.ShowMessageBox(
    "No labels are coming from your inputs, so there is nothing to name.\n\n" ..
    "This usually means the interface is not passing channel labels through to REAPER. Use the CSV import instead.",
    "Auto-name from Inputs", 0)
  return
end

local maxLines = 40
local lines = {}
for i = 1, #proposals do
  if i > maxLines then
    lines[#lines + 1] = "  ... and " .. (#proposals - maxLines) .. " more"
    break
  end
  lines[#lines + 1] = "  " .. proposals[i].number .. ":  " .. proposals[i].name
end

local preview =
  "These names will be applied:\n\n" ..
  table.concat(lines, "\n") .. "\n\n" ..
  #proposals .. " track(s) will be named, " .. skipped .. " skipped (no label).\n\n" ..
  "Apply these names?"

if reaper.ShowMessageBox(preview, "Auto-name from Inputs", 1) ~= 1 then
  return
end
if reaper.GetPlayState() & 4 == 4 then
  reaper.ShowMessageBox("Failed to name tracks: REAPER is recording.\n\nStop first, then name them.", "Auto-name from Inputs", 0)
  return
end

reaper.Undo_BeginBlock()
for i = 1, #proposals do
  reaper.GetSetMediaTrackInfo_String(proposals[i].track, "P_NAME", proposals[i].name, true)
end
reaper.Undo_EndBlock("Auto-name tracks from hardware inputs", 1)
reaper.TrackList_AdjustWindows(false)

reaper.ShowMessageBox(#proposals .. " track(s) named from input labels.", "Auto-name from Inputs", 0)
