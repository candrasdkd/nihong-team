import { IndonesiaDeliveryAddress, JapanDeliveryAddress } from "../types";
import {
  formatJapanPostalCode,
  JAPAN_DELIVERY_TIME_OPTIONS,
  JapanDeliveryAddressErrors,
  normalizeJapanPostalCode,
} from "../utils/deliveryAddress";
import { Input } from "./ui/Input";
import { TextArea } from "./ui/TextArea";

const labelClass = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-500";
const inputClass = "rounded-xl border-slate-200 bg-white focus:border-indigo-400 focus:ring-indigo-400/20";

function FieldLabel({
  children,
  optional = false,
  required = true,
}: {
  children: React.ReactNode;
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <label className={labelClass}>
      {children}
      {optional ? (
        <span className="ml-1 normal-case font-semibold text-slate-400">(opsional)</span>
      ) : required ? (
        <span className="ml-1 text-rose-500">*</span>
      ) : null}
    </label>
  );
}

export function IndonesiaDeliveryAddressFields({
  value,
  onChange,
  disabled = false,
  required = true,
}: {
  value: IndonesiaDeliveryAddress;
  onChange: (value: IndonesiaDeliveryAddress) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const setField = <K extends keyof IndonesiaDeliveryAddress>(
    field: K,
    fieldValue: IndonesiaDeliveryAddress[K],
  ) => onChange({ ...value, [field]: fieldValue });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FieldLabel required={required}>Nama penerima</FieldLabel>
        <Input
          value={value.namaPenerima}
          onChange={(event) => setField("namaPenerima", event.target.value)}
          disabled={disabled}
          required={required}
          autoComplete="name"
          placeholder="Nama lengkap penerima"
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel required={required}>Alamat penerima</FieldLabel>
        <TextArea
          rows={4}
          value={value.alamatPenerima}
          onChange={(event) => setField("alamatPenerima", event.target.value)}
          disabled={disabled}
          required={required}
          autoComplete="street-address"
          placeholder="Jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota/provinsi"
          className={inputClass}
        />
      </div>
      <div>
        <FieldLabel required={required}>Kode pos</FieldLabel>
        <Input
          value={value.kodePos}
          onChange={(event) => setField("kodePos", event.target.value)}
          disabled={disabled}
          required={required}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="Contoh: 12345"
          className={inputClass}
        />
      </div>
      <div>
        <FieldLabel required={required}>No. HP</FieldLabel>
        <Input
          value={value.noHp}
          onChange={(event) => setField("noHp", event.target.value)}
          disabled={disabled}
          required={required}
          inputMode="tel"
          autoComplete="tel"
          placeholder="Contoh: 081234567890"
          className={inputClass}
        />
      </div>
    </div>
  );
}

export function JapanDeliveryAddressFields({
  value,
  onChange,
  disabled = false,
  required = true,
  errors = {},
}: {
  value: JapanDeliveryAddress;
  onChange: (value: JapanDeliveryAddress) => void;
  disabled?: boolean;
  required?: boolean;
  errors?: JapanDeliveryAddressErrors;
}) {
  const setField = <K extends keyof JapanDeliveryAddress>(
    field: K,
    fieldValue: JapanDeliveryAddress[K],
  ) => onChange({ ...value, [field]: fieldValue });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FieldLabel required={required}>Nama Penerima</FieldLabel>
        <Input
          value={value.namaPenerima}
          onChange={(event) => setField("namaPenerima", event.target.value)}
          disabled={disabled}
          required={required}
          autoComplete="name"
          title="Nama Penerima"
          placeholder="Contoh: Taro Yamada"
          error={errors.namaPenerima}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel required={required}>Alamat Penerima (Romaji)</FieldLabel>
        <TextArea
          rows={3}
          value={value.alamatPenerimaRomaji}
          onChange={(event) => setField("alamatPenerimaRomaji", event.target.value)}
          disabled={disabled}
          required={required}
          autoComplete="street-address"
          title="Alamat Penerima dalam Romaji"
          placeholder="Contoh: 1-2-3 Nishi-Shinjuku, Shinjuku-ku, Tokyo"
          error={errors.alamatPenerimaRomaji}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel optional>Alamat Penerima (Kanji)</FieldLabel>
        <TextArea
          rows={3}
          value={value.alamatPenerimaKanji}
          onChange={(event) => setField("alamatPenerimaKanji", event.target.value)}
          disabled={disabled}
          required={false}
          title="Alamat Penerima dalam Kanji"
          placeholder="Contoh: 東京都新宿区西新宿1-2-3"
          error={errors.alamatPenerimaKanji}
          className={inputClass}
        />
      </div>
      <div>
        <FieldLabel required={required}>Kode Pos</FieldLabel>
        <Input
          value={formatJapanPostalCode(value.kodePos)}
          onChange={(event) => setField("kodePos", normalizeJapanPostalCode(event.target.value))}
          disabled={disabled}
          required={required}
          inputMode="numeric"
          maxLength={8}
          autoComplete="postal-code"
          title="Kode Pos"
          placeholder="Contoh: 123-4567"
          error={errors.kodePos}
          className={inputClass}
        />
      </div>
      <div>
        <FieldLabel required={required}>No. HP Aktif (No. Telepon Jepang)</FieldLabel>
        <Input
          value={value.noHpAktif}
          onChange={(event) => setField("noHpAktif", event.target.value)}
          disabled={disabled}
          required={required}
          inputMode="tel"
          autoComplete="tel"
          title="No. HP Aktif (No. Telepon Jepang)"
          placeholder="Contoh: 090-1234-5678"
          error={errors.noHpAktif}
          className={inputClass}
        />
      </div>
      <fieldset className="sm:col-span-2" disabled={disabled}>
        <legend className={labelClass}>
          Jam Penerima Paket
          {required && <span className="ml-1 text-rose-500">*</span>}
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {JAPAN_DELIVERY_TIME_OPTIONS.map((option) => {
            const selected = value.jamPenerimaPaket === option.value;
            return (
              <label
                key={option.value}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                  selected
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/15"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="jamPenerimaPaket"
                  value={option.value}
                  checked={selected}
                  onChange={() => setField("jamPenerimaPaket", option.value)}
                  required={required}
                  className="h-4 w-4 shrink-0 accent-indigo-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="block text-[11px] font-semibold text-slate-400">
                    {option.japaneseLabel}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.jamPenerimaPaket && (
          <p className="mt-1.5 text-xs font-medium text-red-500">
            {errors.jamPenerimaPaket}
          </p>
        )}
      </fieldset>
    </div>
  );
}
