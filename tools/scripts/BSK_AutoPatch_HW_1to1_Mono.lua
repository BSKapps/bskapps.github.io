-- Auto Patch Tracks 1:1
-- Mono hardware inputs and outputs
-- Pre-FX hardware send
-- Master/Parent disabled
-- Monitoring disabled

local trackCount = reaper.CountTracks(0)
local hwOutputs = reaper.GetNumAudioOutputs()
local hwInputs = reaper.GetNumAudioInputs()

if hwOutputs == 0 and hwInputs == 0 then
    reaper.ShowMessageBox("No audio hardware detected. Check your audio device settings.", "Auto Patch", 0)
    return
end

local proceed = reaper.ShowMessageBox(
    "Mono tracks only. A stereo track patches one channel, not both. Use two mono tracks (L and R).\n\nContinue?",
    "Auto Patch", 1)

if proceed ~= 1 then
    return
end

local inputsPatched = 0
local outputsPatched = 0

reaper.Undo_BeginBlock()

for i = 0, trackCount - 1 do

    local track = reaper.GetTrack(0, i)

    -------------------------------------------------
    -- INPUT PATCHING (Mono 1:1)
    -------------------------------------------------
    if i < hwInputs then
        reaper.SetMediaTrackInfo_Value(track, "I_RECINPUT", i)

        -------------------------------------------------
        -- DISABLE MONITORING
        -------------------------------------------------
        reaper.SetMediaTrackInfo_Value(track, "I_RECMON", 0)

        inputsPatched = inputsPatched + 1
    else
        reaper.SetMediaTrackInfo_Value(track, "I_RECINPUT", -1)
    end

    -------------------------------------------------
    -- REMOVE EXISTING HARDWARE OUTPUTS
    -------------------------------------------------
    local hwOutCount = reaper.GetTrackNumSends(track, 1)
    for j = hwOutCount - 1, 0, -1 do
        reaper.RemoveTrackSend(track, 1, j)
    end

    if i < hwOutputs then

        -------------------------------------------------
        -- DISABLE MASTER SEND
        -------------------------------------------------
        reaper.SetMediaTrackInfo_Value(track, "B_MAINSEND", 0)

        -------------------------------------------------
        -- CREATE HARDWARE OUTPUT
        -------------------------------------------------
        local sendIndex = reaper.CreateTrackSend(track, nil)

        reaper.SetTrackSendInfo_Value(track, 1, sendIndex, "I_SRCCHAN", 1024)

        -- mono output channel
        reaper.SetTrackSendInfo_Value(track, 1, sendIndex, "I_DSTCHAN", i)

        -- Pre-FX
        reaper.SetTrackSendInfo_Value(track, 1, sendIndex, "I_SENDMODE", 1)

        -- unity gain
        reaper.SetTrackSendInfo_Value(track, 1, sendIndex, "D_VOL", 1.0)

        outputsPatched = outputsPatched + 1
    end
end

reaper.Undo_EndBlock("Auto Patch Tracks 1:1 Hardware IO", -1)
reaper.TrackList_AdjustWindows(false)

-------------------------------------------------
-- SUMMARY POPUP
-------------------------------------------------

local message =
"Auto Patch Complete\n\n" ..
"Hardware inputs available: " .. hwInputs .. "\n" ..
"Hardware outputs available: " .. hwOutputs .. "\n" ..
"Track inputs patched: " .. inputsPatched .. "\n" ..
"Track outputs patched: " .. outputsPatched .. "\n\n" ..
"Tracks with a patched input:\n" ..
"  - Mono hardware input assigned 1:1\n" ..
"  - Record monitoring: disabled\n\n" ..
"Tracks with a patched output:\n" ..
"  - Mono hardware output assigned 1:1\n" ..
"  - Send mode: Pre-Fader/Pre-FX, volume: unity (0dB)\n" ..
"  - Master/Parent send: disabled"

reaper.ShowMessageBox(message, "Auto Patch", 0)
