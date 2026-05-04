import Link from "next/link";

export default function HowToUsePage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-sky-50/60 px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <img src="/profitscope-logo.png" alt="ProfitScope" className="h-[90px] w-auto" />
          <h1 className="mt-2 text-2xl font-bold text-slate-900">ProfitScope 使い方</h1>
          <p className="mt-2 text-sm text-slate-600">
            このページでは、入力手順・CSV取込・税計算モード・グラフの見方をまとめています。
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              ダッシュボードに戻る
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">1. 基本入力</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>会計年度・投下資本を入力します（決算期は 6/1〜5/31、年度は期末年）。</li>
            <li>勘定科目はプルダウンから選択し、金額を入力します（入力中に3桁カンマ表示）。</li>
            <li>年次入力はサマリー・KPI・費用内訳へ反映されます。</li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">2. CSV取込</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>列名は `日付, 勘定科目, 摘要, OUT（出金）またはOUT, IN（入金）またはIN` を使用します。</li>
            <li>取込時に年次・月次へ集計反映します。複数年度混在時は最新会計年度のみ集計します。</li>
            <li>法人税等がデータに無い場合は、自動で `法人税等 0円` を追加します。</li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">3. 税計算モード</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>`手入力`: 法人税等は入力した金額をそのまま使用します。</li>
            <li>`概算税率`: 税引前利益から法人税等を自動再計算します。</li>
            <li>`消費税手入力`: ONにすると、入力した消費税を販管費として加算します。</li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">4. グラフの見方</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>費用内訳は `カテゴリ別` と `科目別` を切り替えできます。</li>
            <li>月次推移は決算期順（6月→翌5月）で表示します。</li>
            <li>年次入力のみでは月次推移には反映されません（月次データまたはCSV日付が必要）。</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
