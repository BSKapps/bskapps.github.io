-- Auto Route Tracks
-- Hardware outputs pre FX and pre fader
-- Master/Parent disabled
-- Monitoring disabled

if reaper.GetPlayState() & 5 ~= 0 then
    reaper.ShowMessageBox("Failed to auto route: REAPER is playing or recording.\n\nStop first, then route.", "Auto Route", 0)
    return
end

local trackCount = reaper.CountTracks(0)

local routed = {}
for i = 0, trackCount - 1 do
    local track = reaper.GetTrack(0, i)
    if reaper.GetTrackNumSends(track, 1) > 0 then
        routed[#routed + 1] = track
    end
end

if #routed == 0 then
    reaper.ShowMessageBox("Failed to auto route: no track has a hardware output.\n\nRun AUTO PATCH first, or add outputs by hand.", "Auto Route", 0)
    return
end

local unrouted = trackCount - #routed

local message =
    "Auto Route sets every track that has a hardware output:\n" ..
    "- Pre FX and pre fader\n" ..
    "- Record monitoring off\n" ..
    "- Master send off"
if unrouted > 0 then
    message = message .. "\n\n" .. unrouted .. " track(s) have no hardware output and are left as they are."
end
message = message .. "\n\nContinue?"

if reaper.ShowMessageBox(message, "Auto Route", 1) ~= 1 then
    return
end

if reaper.GetPlayState() & 5 ~= 0 then
    reaper.ShowMessageBox("Failed to auto route: REAPER started playing or recording.\n\nNothing was changed.", "Auto Route", 0)
    return
end

reaper.Undo_BeginBlock()

for _, track in ipairs(routed) do
    for s = 0, reaper.GetTrackNumSends(track, 1) - 1 do
        reaper.SetTrackSendInfo_Value(track, 1, s, "I_SENDMODE", 1)
    end
    reaper.SetMediaTrackInfo_Value(track, "I_RECMON", 0)
    reaper.SetMediaTrackInfo_Value(track, "B_MAINSEND", 0)
end

reaper.Undo_EndBlock("Auto Route Tracks Pre FX", 1)
local dir = debug.getinfo(1, "S").source:match("^@(.*[/\\])")
local common = dir .. "BSK_Transport_Common.lua"
if reaper.file_exists(common) then dofile(common).forgetSetup() end
reaper.TrackList_AdjustWindows(false)

reaper.ShowMessageBox("Auto Route Complete\n\nTracks routed: " .. #routed, "Auto Route", 0)
