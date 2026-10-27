-- Teardown Hardware Routing
-- Removes all hardware sends and restores Master send

if reaper.GetPlayState() & 5 ~= 0 then
    reaper.ShowMessageBox("Failed to tear down the routing: REAPER is playing or recording.\n\nStop first, then tear down.", "Teardown", 0)
    return
end

local trackCount = reaper.CountTracks(0)

if reaper.ShowMessageBox("Remove every track's hardware outputs and inputs, and turn master send and record monitoring on?", "Teardown", 1) ~= 1 then
    return
end
local removed = 0

reaper.Undo_BeginBlock()

for i = 0, trackCount - 1 do

    local track = reaper.GetTrack(0, i)

    -- restore master send
    reaper.SetMediaTrackInfo_Value(track, "B_MAINSEND", 1)

    -- restore monitoring
    reaper.SetMediaTrackInfo_Value(track, "I_RECMON", 1)

    -- clear hardware input
    reaper.SetMediaTrackInfo_Value(track, "I_RECINPUT", -1)

    -- remove hardware outputs
    local hwOutCount = reaper.GetTrackNumSends(track, 1)

    for j = hwOutCount - 1, 0, -1 do
        reaper.RemoveTrackSend(track, 1, j)
        removed = removed + 1
    end

end

reaper.Undo_EndBlock("Teardown Hardware Routing", 1)
local dir = debug.getinfo(1, "S").source:match("^@(.*[/\\])")
local common = dir .. "BSK_Transport_Common.lua"
if reaper.file_exists(common) then dofile(common).forgetSetup() end
reaper.TrackList_AdjustWindows(false)

-------------------------------------------------
-- CONFIRMATION POPUP
-------------------------------------------------

local message =
"Routing Teardown Complete\n\n" ..
"Tracks processed: " .. trackCount .. "\n" ..
"Hardware outputs removed: " .. removed .. "\n\n" ..
"Changes applied to each track:\n" ..
"  - Hardware input/output: cleared\n" ..
"  - Master send: turned on\n" ..
"  - Record monitoring: turned on"

reaper.ShowMessageBox(message, "Teardown", 0)
