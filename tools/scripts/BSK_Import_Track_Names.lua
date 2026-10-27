local function refuseWhileRecording()
    if reaper.GetPlayState() & 4 == 4 then
        reaper.ShowMessageBox("Failed to import track names: REAPER is recording.\n\nStop first, then import.", "Import Track Names", 0)
        return true
    end
    return false
end

if refuseWhileRecording() then return end

local retval, filepath = reaper.GetUserFileNameForRead("", "Import Track Names", "")
if not retval then return end

local file = io.open(filepath, "r")
if not file then
    reaper.ShowMessageBox("Failed to open the file.", "Import Track Names", 0)
    return
end

local content = file:read("a") or ""
file:close()

local MAC_ROMAN = {
    0x00C4, 0x00C5, 0x00C7, 0x00C9, 0x00D1, 0x00D6, 0x00DC, 0x00E1, 0x00E0, 0x00E2, 0x00E4, 0x00E3, 0x00E5, 0x00E7, 0x00E9, 0x00E8,
    0x00EA, 0x00EB, 0x00ED, 0x00EC, 0x00EE, 0x00EF, 0x00F1, 0x00F3, 0x00F2, 0x00F4, 0x00F6, 0x00F5, 0x00FA, 0x00F9, 0x00FB, 0x00FC,
    0x2020, 0x00B0, 0x00A2, 0x00A3, 0x00A7, 0x2022, 0x00B6, 0x00DF, 0x00AE, 0x00A9, 0x2122, 0x00B4, 0x00A8, 0x2260, 0x00C6, 0x00D8,
    0x221E, 0x00B1, 0x2264, 0x2265, 0x00A5, 0x00B5, 0x2202, 0x2211, 0x220F, 0x03C0, 0x222B, 0x00AA, 0x00BA, 0x03A9, 0x00E6, 0x00F8,
    0x00BF, 0x00A1, 0x00AC, 0x221A, 0x0192, 0x2248, 0x2206, 0x00AB, 0x00BB, 0x2026, 0x00A0, 0x00C0, 0x00C3, 0x00D5, 0x0152, 0x0153,
    0x2013, 0x2014, 0x201C, 0x201D, 0x2018, 0x2019, 0x00F7, 0x25CA, 0x00FF, 0x0178, 0x2044, 0x20AC, 0x2039, 0x203A, 0xFB01, 0xFB02,
    0x2021, 0x00B7, 0x201A, 0x201E, 0x2030, 0x00C2, 0x00CA, 0x00C1, 0x00CB, 0x00C8, 0x00CD, 0x00CE, 0x00CF, 0x00CC, 0x00D3, 0x00D4,
    0xF8FF, 0x00D2, 0x00DA, 0x00DB, 0x00D9, 0x0131, 0x02C6, 0x02DC, 0x00AF, 0x02D8, 0x02D9, 0x02DA, 0x00B8, 0x02DD, 0x02DB, 0x02C7,
}

if not utf8.len(content) then
    content = content:gsub("[\128-\255]", function(c) return utf8.char(MAC_ROMAN[c:byte() - 127]) end)
end

content = content:gsub("\r\n", "\n"):gsub("\r", "\n")
if content ~= "" and content:sub(-1) ~= "\n" then content = content .. "\n" end

local lines = {}
for line in content:gmatch("(.-)\n") do
    table.insert(lines, line)
end

if lines[1] then
    lines[1] = lines[1]:gsub("^\239\187\191", "")
end

local function trim(s)
    return s:match("^%s*(.-)%s*$")
end

local function parseCSVLine(line)
    local fields = {}
    local i = 1
    local n = #line
    while i <= n do
        local k = i
        while line:sub(k, k):match("^%s$") do k = k + 1 end
        if line:sub(k, k) == '"' then i = k end
        if line:sub(i, i) == '"' then
            local field = ""
            i = i + 1
            while i <= n do
                if line:sub(i, i) == '"' then
                    if line:sub(i + 1, i + 1) == '"' then
                        field = field .. '"'
                        i = i + 2
                    else
                        i = i + 1
                        break
                    end
                else
                    field = field .. line:sub(i, i)
                    i = i + 1
                end
            end
            table.insert(fields, field)
            while line:sub(i, i):match("^%s$") do i = i + 1 end
            if line:sub(i, i) == "," then i = i + 1 end
        else
            local j = line:find(",", i, true)
            if j then
                table.insert(fields, trim(line:sub(i, j - 1)))
                i = j + 1
            else
                table.insert(fields, trim(line:sub(i)))
                break
            end
        end
    end
    return fields
end

local function findNameCol(fields)
    local targets = { "name", "channel name", "input name", "ch name", "label" }
    for i, h in ipairs(fields) do
        for _, t in ipairs(targets) do
            if trim(h):lower() == t then return i end
        end
    end
    return nil
end

local function countNamed(list)
    local count = 0
    for _, n in ipairs(list) do
        if n ~= "" then count = count + 1 end
    end
    return count
end

local names = {}

local inChannels = false
local nameCol = nil
local sectionHeaderParsed = false
local nameHeaderFound = false

for _, line in ipairs(lines) do
    local trimmed = trim(line)
    if trimmed:lower():match("^%[channels%]") then
        inChannels = true
        sectionHeaderParsed = false
        nameCol = nil
    elseif trimmed:match("^%[") then
        inChannels = false
    elseif inChannels and not sectionHeaderParsed and #trimmed > 0 then
        nameCol = findNameCol(parseCSVLine(trimmed))
        sectionHeaderParsed = true
        if nameCol then nameHeaderFound = true end
    elseif inChannels and nameCol and #trimmed > 0 then
        local fields = parseCSVLine(trimmed)
        table.insert(names, trim(fields[nameCol] or ""))
    end
end

if countNamed(names) == 0 and not nameHeaderFound then
    names = {}
    local headerFound = false
    local singleColumn = false
    local seenAny = false
    nameCol = nil
    for _, line in ipairs(lines) do
        local trimmed = trim(line)
        if #trimmed == 0 then
            if headerFound and singleColumn then table.insert(names, "") end
            goto continue
        end
        if not headerFound then
            local fields = parseCSVLine(trimmed)
            local col = findNameCol(fields)
            if col and (#fields >= 2 or not seenAny) then
                nameCol = col
                headerFound = true
                nameHeaderFound = true
                singleColumn = #fields == 1
            end
            seenAny = true
        elseif nameCol then
            local fields = parseCSVLine(trimmed)
            table.insert(names, trim(fields[nameCol] or ""))
        end
        ::continue::
    end
end

if countNamed(names) == 0 and not nameHeaderFound then
    names = {}
    for _, line in ipairs(lines) do
        local trimmed = trim(line)
        if #trimmed > 0 then
            table.insert(names, trimmed)
        end
    end
end

while #names > 0 and names[#names] == "" do
    table.remove(names)
end

if countNamed(names) == 0 then
    reaper.ShowMessageBox("No track names found in file.", "Import Track Names", 0)
    return
end

local PREVIEW_MAX = 8
local preview = {}
for i, name in ipairs(names) do
    if #preview == PREVIEW_MAX then
        preview[#preview + 1] = "  ...and " .. (#names - i + 1) .. " more"
        break
    end
    preview[#preview + 1] = "  " .. i .. ":  " .. (name ~= "" and name or "(blank, keeps its name)")
end

local mode = reaper.ShowMessageBox(
    "Rename your existing tracks with these " .. countNamed(names) .. " names?\n\n" .. table.concat(preview, "\n") .. "\n\nYes renames them. No adds new tracks instead.",
    "Import Track Names",
    3
)

if mode ~= 6 and mode ~= 7 then return end
if refuseWhileRecording() then return end

reaper.Undo_BeginBlock()

if mode == 6 then
    local trackCount = reaper.CountTracks(0)
    local renamed = 0
    for i, name in ipairs(names) do
        if i - 1 >= trackCount then break end
        if name ~= "" then
            local track = reaper.GetTrack(0, i - 1)
            reaper.GetSetMediaTrackInfo_String(track, "P_NAME", name, true)
            renamed = renamed + 1
        end
    end
    reaper.Undo_EndBlock("Import Track Names from File", 1)
    reaper.TrackList_AdjustWindows(false)
    reaper.ShowMessageBox(renamed .. " tracks renamed.", "Import Track Names", 0)
else
    local startIndex = reaper.CountTracks(0)
    for i, name in ipairs(names) do
        reaper.InsertTrackAtIndex(startIndex + i - 1, false)
        local track = reaper.GetTrack(0, startIndex + i - 1)
        reaper.GetSetMediaTrackInfo_String(track, "P_NAME", name, true)
    end
    reaper.Undo_EndBlock("Import Track Names from File", 1)
    reaper.TrackList_AdjustWindows(false)
    local named = countNamed(names)
    if named == #names then
        reaper.ShowMessageBox(#names .. " tracks created.", "Import Track Names", 0)
    else
        reaper.ShowMessageBox(#names .. " tracks created, " .. named .. " named.", "Import Track Names", 0)
    end
end
