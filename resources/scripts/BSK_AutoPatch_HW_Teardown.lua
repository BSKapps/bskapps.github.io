-- Teardown Hardware Routing
-- Removes all hardware sends and restores Master send

local trackCount = reaper.CountTracks(0)
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

reaper.Undo_EndBlock("Teardown Hardware Routing", -1)
reaper.TrackList_AdjustWindows(false)

-------------------------------------------------
-- CONFIRMATION POPUP
-------------------------------------------------

local message =
"Routing Teardown Complete\n\n" ..
"Tracks processed: " .. trackCount .. "\n" ..
"Hardware sends removed: " .. removed .. "\n\n" ..
"Changes applied to each track:\n" ..
"  • Hardware input/output: cleared\n" ..
"  • Master/Parent send: restored\n" ..
"  • Record monitoring: restored"

reaper.ShowMessageBox(message, "Teardown", 0)
