import { spawn } from 'node:child_process'
import type { Plugin } from 'vite'
import type { AppState } from '../src/domain/types'

export const DEFAULT_SPREADSHEET_ID = '1bWRdtknPrfmjZzwZ-1YPNzEuRUXN9_OMPCcQv0ZXY_s'

function runGsheets(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const bin = `${process.env.USERPROFILE || 'C:\\Users\\0100878206'}\\.gemini\\antigravity\\bin\\gsheets.cmd`
    const proc = spawn('cmd.exe', ['/c', bin, ...args], { windowsHide: true })
    let out = ''
    let err = ''
    proc.stdout.on('data', (d) => (out += d.toString()))
    proc.stderr.on('data', (d) => (err += d.toString()))
    proc.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else reject(new Error(err.trim() || out.trim() || `gsheets exited with ${code}`))
    })
  })
}

function buildBatchOps(state: AppState) {
  const j = state.journey
  const journeyRows: string[][] = [
    ['Trường cấu hình', 'Giá trị', 'Ghi chú'],
    ['ID hành trình', j?.id ?? '', 'Mã định danh hành trình'],
    ['Tên hành trình', j?.name ?? 'Chưa thiết lập', 'Tên chung của hai bạn'],
    ['Mục tiêu (VND)', String(j?.goal ?? 0), 'Số tiền mục tiêu chung'],
    ['Ngày bắt đầu', j?.startDate ?? '', 'YYYY-MM-DD'],
    ['Thời hạn (tháng)', String(j?.months ?? 0), 'Số tháng tiết kiệm'],
    ['Ngày kết thúc', j?.endDate ?? '', 'YYYY-MM-DD'],
    ['Chế độ chia mức góp', j?.fairness ?? 'proportional', 'proportional / equal / custom'],
    ['Tỷ lệ người 1 (%)', String(j?.customPctA ?? 50), 'Áp dụng khi custom'],
    ['Mức tối thiểu/ngày (VND)', String(j?.dailyMin ?? 0), 'Tổng 2 người'],
    ['Mức tối đa/ngày (VND)', String(j?.dailyMax ?? ''), 'Tổng 2 người (trống = tự động)'],
    ['Người 1 - Tên', j?.members.a.name ?? '', 'Chủ hành trình'],
    ['Người 1 - Thu nhập/tháng (VND)', String(j?.members.a.income ?? 0), 'VND'],
    ['Người 2 - Tên', j?.members.b.name ?? '', 'Thành viên'],
    ['Người 2 - Thu nhập/tháng (VND)', String(j?.members.b.income ?? 0), 'VND'],
    ['Tên heo đất', j?.pig.name ?? '', 'Mascot'],
    ['Kiểu heo đất', j?.pig.style ?? '', 'baby / round / glasses / crown / hat / hoodie'],
    ['Màu heo đất', j?.pig.color ?? '', 'Hex color'],
    ['Phông nền', j?.pig.background ?? '', 'sky / garden / sunset / night'],
    ['Đã hoàn tất cài đặt', String(j?.setupDone ?? false), 'true / false'],
    ['Cập nhật lần cuối', new Date().toISOString(), 'ISO timestamp'],
  ]

  const revealRows: string[][] = [
    ['Mã mở số', 'Ngày', 'Người bấm mở', 'Số tiền Người 1 (VND)', 'Số tiền Người 2 (VND)', 'Tổng cộng (VND)', 'Thời gian tạo'],
    ...state.reveals.map((r) => [
      r.id,
      r.date,
      j ? j.members[r.initiatedBy].name : r.initiatedBy,
      String(r.amounts.a),
      String(r.amounts.b),
      String(r.amounts.a + r.amounts.b),
      r.createdAt,
    ]),
  ]

  const contributionRows: string[][] = [
    ['Mã khoản góp', 'Ngày', 'Thành viên', 'Số tiền (VND)', 'Trạng thái', 'Nguồn mở số', 'Ghi chú', 'Tạo lúc', 'Xác nhận lúc'],
    ...state.contributions.map((c) => [
      c.id,
      c.date,
      j ? j.members[c.member].name : c.member,
      String(c.amount),
      c.status,
      c.revealId ?? 'Nạp thêm',
      c.notes || '',
      c.createdAt,
      c.confirmedAt ?? '',
    ]),
  ]

  const activityRows: string[][] = [
    ['Mã sự kiện', 'Thời gian', 'Loại', 'Thành viên', 'Số tiền (VND)', 'Tiêu đề', 'Mô tả', 'Trạng thái'],
    ...state.activity.slice(0, 200).map((a) => [
      a.id,
      a.at,
      a.type,
      a.member ? (j ? j.members[a.member].name : a.member) : '',
      a.amount != null ? String(a.amount) : '',
      a.title,
      a.description ?? '',
      a.status ?? '',
    ]),
  ]

  const challengeRows: string[][] = [
    ['Mã thử thách', 'Trạng thái', 'Hoàn thành lúc'],
    ...Object.entries(state.challengeStatus).map(([id, st]) => [
      id,
      st,
      state.completedAt[id] ?? '',
    ]),
  ]

  const notificationRows: string[][] = [
    ['Mã thông báo', 'Thời gian', 'Loại', 'Tiêu đề', 'Nội dung', 'Đã đọc'],
    ...state.notifications.slice(0, 100).map((n) => [
      n.id,
      n.at,
      n.type,
      n.title,
      n.message,
      String(n.read),
    ]),
  ]

  const appStateRows: string[][] = [
    ['key', 'updated_at', 'json_state'],
    ['piggy_duo_state_v1', new Date().toISOString(), JSON.stringify(state)],
  ]

  return [
    { op: 'clear', range: 'Journey!A1:Z100' },
    { op: 'write', range: 'Journey!A1', data: journeyRows },
    { op: 'clear', range: 'DailyReveals!A1:Z500' },
    { op: 'write', range: 'DailyReveals!A1', data: revealRows },
    { op: 'clear', range: 'Contributions!A1:Z1000' },
    { op: 'write', range: 'Contributions!A1', data: contributionRows },
    { op: 'clear', range: 'ActivityLog!A1:Z500' },
    { op: 'write', range: 'ActivityLog!A1', data: activityRows },
    { op: 'clear', range: 'Challenges!A1:Z200' },
    { op: 'write', range: 'Challenges!A1', data: challengeRows },
    { op: 'clear', range: 'Notifications!A1:Z300' },
    { op: 'write', range: 'Notifications!A1', data: notificationRows },
    { op: 'clear', range: 'AppState!A1:C5' },
    { op: 'write', range: 'AppState!A1', data: appStateRows },
  ]
}

export function gsheetsBridgePlugin(): Plugin {
  return {
    name: 'piggy-duo-gsheets-bridge',
    configureServer(server) {
      server.middlewares.use('/api/gsheets', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        const url = new URL(req.url || '/', 'http://localhost')
        const spreadsheetId = url.searchParams.get('id') || process.env.VITE_GOOGLE_SHEET_ID || DEFAULT_SPREADSHEET_ID

        try {
          if (req.method === 'GET') {
            const raw = await runGsheets(['readonly', 'read', spreadsheetId, 'AppState!A2:C2', '--json'])
            const rows = JSON.parse(raw || '[]') as string[][]
            const jsonCell = rows?.[0]?.[2]
            if (!jsonCell) {
              res.end(JSON.stringify({ ok: true, empty: true, spreadsheetId }))
              return
            }
            res.end(JSON.stringify({ ok: true, spreadsheetId, updatedAt: rows[0][1], state: JSON.parse(jsonCell) }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            for await (const chunk of req) body += chunk
            const parsed = JSON.parse(body || '{}') as {
              state?: AppState
              spreadsheetId?: string
              webPush?: { endpoint: string; headers: Record<string, string>; bodyBase64: string }
            }
            const targetId = parsed.spreadsheetId || spreadsheetId
            if (!parsed.state) {
              res.statusCode = 400
              res.end(JSON.stringify({ ok: false, error: 'Missing state payload' }))
              return
            }
            if (parsed.webPush?.endpoint && parsed.webPush?.bodyBase64) {
              void fetch(parsed.webPush.endpoint, {
                method: 'POST',
                headers: parsed.webPush.headers,
                body: Buffer.from(parsed.webPush.bodyBase64, 'base64'),
              }).catch(() => undefined)
            }
            const fs = await import('node:fs/promises')
            const os = await import('node:os')
            const path = await import('node:path')
            const tmpFile = path.join(os.tmpdir(), `piggy-duo-batch-${Date.now()}.json`)
            await fs.writeFile(tmpFile, JSON.stringify(buildBatchOps(parsed.state)), 'utf8')
            try {
              await runGsheets(['mutate', 'batch', targetId, '-f', tmpFile])
            } finally {
              await fs.unlink(tmpFile).catch(() => undefined)
            }
            res.end(JSON.stringify({ ok: true, spreadsheetId: targetId, syncedAt: new Date().toISOString() }))
            return
          }

          res.statusCode = 405
          res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }))
        }
      })
    },
  }
}
