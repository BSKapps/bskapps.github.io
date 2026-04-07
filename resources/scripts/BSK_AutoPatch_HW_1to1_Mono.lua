-- Auto Patch Tracks 1:1
-- Mono hardware inputs and outputs
-- Pre-FX hardware send
-- Master/Parent disabled
-- Monitoring disabled

local trackCount = reaper.CountTracks(0)
local hwOutputs = reaper.GetNumAudioOutputs()

local patched = 0
local skipped = 0

reaper.Undo_BeginBlock()

for i = 0, trackCount - 1 do

    local track = reaper.GetTrack(0, i)

    -- only patch if a hardware output exists for this channel
    if i < hwOutputs then

        -------------------------------------------------
        -- INPUT PATCHING (Mono 1:1)
        -------------------------------------------------
        reaper.SetMediaTrackInfo_Value(track, "I_RECINPUT", i)

        -------------------------------------------------
        -- DISABLE MONITORING
        -------------------------------------------------
        reaper.SetMediaTrackInfo_Value(track, "I_RECMON", 0)

        -------------------------------------------------
        -- DISABLE MASTER SEND
        -------------------------------------------------
        reaper.SetMediaTrackInfo_Value(track, "B_MAINSEND", 0)

        -------------------------------------------------
        -- REMOVE EXISTING HARDWARE OUTPUTS
        -------------------------------------------------
        local hwOutCount = reaper.GetTrackNumSends(track, 1)
        for j = hwOutCount - 1, 0, -1 do
            reaper.RemoveTrackSend(track, 1, j)
        end

        -------------------------------------------------
        -- CREATE HARDWARE OUTPUT
        -------------------------------------------------
        local sendIndex = reaper.CreateTrackSend(track, nil)

        -- mono output channel
        reaper.SetTrackSendInfo_Value(track, 1, sendIndex, "I_DSTCHAN", i)

        -- Pre-FX
        reaper.SetTrackSendInfo_Value(track, 1, sendIndex, "I_SENDMODE", 1)

        -- unity gain
        reaper.SetTrackSendInfo_Value(track, 1, sendIndex, "D_VOL", 1.0)

        patched = patched + 1

    else
        -- track exceeds available hardware -- clear input and remove any existing HW sends
        reaper.SetMediaTrackInfo_Value(track, "I_RECINPUT", -1)
        local hwOutCount = reaper.GetTrackNumSends(track, 1)
        for j = hwOutCount - 1, 0, -1 do
            reaper.RemoveTrackSend(track, 1, j)
        end
        skipped = skipped + 1
    end
end

reaper.Undo_EndBlock("Auto Patch Tracks 1:1 Hardware IO", -1)
reaper.TrackList_AdjustWindows(false)

-------------------------------------------------
-- SUMMARY POPUP
-------------------------------------------------

local message =
"Auto Patch Complete\n\n" ..
"Hardware outputs available: " .. hwOutputs .. "\n" ..
"Tracks patched: " .. patched .. "\n" ..
"Tracks skipped (exceeds hardware): " .. skipped .. "\n\n" ..
"Changes applied to each patched track:\n" ..
"  • Hardware input/output assigned 1:1 mono\n" ..
"  • Send mode: Pre-Fader/Pre-FX\n" ..
"  • Send volume: unity (0dB)\n" ..
"  • Master/Parent send: disabled\n" ..
"  • Record monitoring: disabled"

reaper.ShowMessageBox(message, "Auto Patch", 0)
