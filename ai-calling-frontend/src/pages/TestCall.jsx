import React, { useEffect, useMemo, useState } from 'react';
import { PhoneCall, Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  createSipCall,
  fetchSipPhoneNumbers,
  fetchSipRoutingRules
} from '../services/videosdkApi';
import { COUNTRY_CODES, buildE164, getDialCode } from '../utils/countryCodes';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const emptyMetaRow = () => ({ id: `${Date.now()}-${Math.random()}`, key: '', value: '' });

const normalizePhone = (value = '') => {
  const trimmed = String(value).trim().replace(/[\s()-]/g, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  if (/^\d+$/.test(trimmed)) return `+${trimmed}`;
  return trimmed;
};

const TestCallPage = () => {
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [routingRules, setRoutingRules] = useState([]);

  const [sipCallFrom, setSipCallFrom] = useState('');
  const [routingRuleId, setRoutingRuleId] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [localNumber, setLocalNumber] = useState('');
  const [participantName, setParticipantName] = useState('Test Caller');
  const [recordAudio, setRecordAudio] = useState(true);
  const [waitUntilAnswered, setWaitUntilAnswered] = useState(false);
  const [ringingTimeout, setRingingTimeout] = useState(30);
  const [metaRows, setMetaRows] = useState([emptyMetaRow()]);
  const [lastResult, setLastResult] = useState(null);

  const activeOutboundNumbers = useMemo(
    () =>
      phoneNumbers.filter(
        (item) =>
          item?.phoneNumber?.status === 'ACTIVE' &&
          item?.outbound?.id &&
          (item?.phoneNumber?.e164 || item?.outbound?.numbers?.[0])
      ),
    [phoneNumbers]
  );

  const outboundRules = useMemo(
    () => routingRules.filter((rule) => String(rule.type).toLowerCase() === 'outbound'),
    [routingRules]
  );

  const selectedRule = useMemo(
    () => outboundRules.find((rule) => rule.id === routingRuleId) || null,
    [outboundRules, routingRuleId]
  );

  const loadSetup = async () => {
    setLoadingSetup(true);
    try {
      const [numbersRes, rulesRes] = await Promise.all([
        fetchSipPhoneNumbers({ page: 1, perPage: 50 }),
        fetchSipRoutingRules({ page: 1, perPage: 50 })
      ]);

      const numbers = Array.isArray(numbersRes.data) ? numbersRes.data : [];
      const rules = Array.isArray(rulesRes.data) ? rulesRes.data : [];
      setPhoneNumbers(numbers);
      setRoutingRules(rules);

      const firstActive = numbers.find(
        (item) => item?.phoneNumber?.status === 'ACTIVE' && item?.outbound?.id
      );
      const firstOutboundRule = rules.find((rule) => String(rule.type).toLowerCase() === 'outbound');

      setSipCallFrom((prev) => prev || firstActive?.phoneNumber?.e164 || '');
      setRoutingRuleId((prev) => prev || firstOutboundRule?.id || '');
    } catch (err) {
      toast.error(err.message || 'Failed to load call setup');
    } finally {
      setLoadingSetup(false);
    }
  };

  useEffect(() => {
    loadSetup();
  }, []);

  const updateMetaRow = (id, field, value) => {
    setMetaRows((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeMetaRow = (id) => {
    setMetaRows((rows) => (rows.length <= 1 ? [emptyMetaRow()] : rows.filter((row) => row.id !== id)));
  };

  const buildMetadata = () => {
    const metadata = {};
    metaRows.forEach((row) => {
      const key = row.key.trim();
      if (!key) return;
      metadata[key] = row.value;
    });
    return metadata;
  };

  const placeTestCall = async (e) => {
    e.preventDefault();

    const from = normalizePhone(sipCallFrom);
    const to = buildE164(countryCode, localNumber);

    if (!from) {
      toast.error('Please select a caller ID number');
      return;
    }
    if (!to || localNumber.trim().length < 6) {
      toast.error('Please enter a valid destination phone number');
      return;
    }
    if (!routingRuleId) {
      toast.error('Please select an outbound routing rule');
      return;
    }

    const selectedNumber = activeOutboundNumbers.find((item) => item.phoneNumber?.e164 === from);
    const metadata = buildMetadata();

    const payload = {
      sipCallFrom: from,
      sipCallTo: to,
      routingRuleId,
      gatewayId: selectedNumber?.outbound?.id || undefined,
      participant: {
        name: participantName.trim() || 'Test Caller'
      },
      recordAudio,
      waitUntilAnswered,
      ringingTimeout: Number(ringingTimeout) || 30,
      ...(Object.keys(metadata).length ? { metadata } : {})
    };

    setSubmitting(true);
    try {
      const res = await createSipCall(payload);
      setLastResult(res);
      toast.success(res.message || 'Test call initiated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to place test call');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Test Call</h2>
          <p className="text-sm text-slate-500">
            Enter a mobile number and place a test call using your configured SIP setup
          </p>
        </div>
        <Button size="sm" variant="secondary" icon={RefreshCw} onClick={loadSetup} disabled={loadingSetup}>
          {loadingSetup ? 'Loading…' : 'Reload Setup'}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2" title="Get a Test Call" subtitle="Choose caller ID, routing rule, and destination number">
          <form onSubmit={placeTestCall} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Call From *
                </label>
                <select
                  className="custom-input text-sm font-semibold"
                  value={sipCallFrom}
                  disabled={loadingSetup}
                  onChange={(e) => setSipCallFrom(e.target.value)}
                  required
                >
                  <option value="">{loadingSetup ? 'Loading numbers…' : 'Select caller ID'}</option>
                  {activeOutboundNumbers.map((item) => (
                    <option key={item.phoneNumber.phoneNumberId} value={item.phoneNumber.e164}>
                      {item.phoneNumber.e164}
                      {item.phoneNumber.name ? ` · ${item.phoneNumber.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Routing Rule *
                </label>
                <select
                  className="custom-input text-sm font-semibold"
                  value={routingRuleId}
                  disabled={loadingSetup}
                  onChange={(e) => setRoutingRuleId(e.target.value)}
                  required
                >
                  <option value="">{loadingSetup ? 'Loading rules…' : 'Select outbound rule'}</option>
                  {outboundRules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name} ({rule.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Agent ID
                </label>
                <input
                  className="custom-input text-sm font-semibold bg-slate-50"
                  value={selectedRule?.dispatch?.agent?.id || '—'}
                  readOnly
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Participant Name
                </label>
                <input
                  className="custom-input text-sm"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Test Caller"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Destination Phone Number *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className="custom-input text-sm font-semibold sm:!w-[220px] shrink-0"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    {COUNTRY_CODES.map((country) => (
                      <option key={`${country.code}-${country.dial}`} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                      {getDialCode(countryCode)}
                    </span>
                    <input
                      className="custom-input text-sm font-semibold !pl-14"
                      value={localNumber}
                      onChange={(e) => setLocalNumber(e.target.value.replace(/[^\d\s-]/g, ''))}
                      placeholder="8347325704"
                      inputMode="tel"
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Full number: <span className="font-semibold text-slate-600">{buildE164(countryCode, localNumber) || '—'}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordAudio}
                  onChange={(e) => setRecordAudio(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-700">Record audio</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waitUntilAnswered}
                  onChange={(e) => setWaitUntilAnswered(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-700">Wait until answered</span>
              </label>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Ringing timeout (sec)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  className="custom-input text-sm"
                  value={ringingTimeout}
                  onChange={(e) => setRingingTimeout(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Metadata</p>
                  <p className="text-xs text-slate-400">Optional key–value pairs for routing or tracking</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={Plus}
                  onClick={() => setMetaRows((rows) => [...rows, emptyMetaRow()])}
                >
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {metaRows.map((row) => (
                  <div key={row.id} className="flex flex-col sm:flex-row gap-2">
                    <input
                      className="custom-input text-sm"
                      placeholder="Key (e.g. campaignId)"
                      value={row.key}
                      onChange={(e) => updateMetaRow(row.id, 'key', e.target.value)}
                    />
                    <input
                      className="custom-input text-sm"
                      placeholder="Value"
                      value={row.value}
                      onChange={(e) => updateMetaRow(row.id, 'value', e.target.value)}
                    />
                    <Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={() => removeMetaRow(row.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" icon={PhoneCall} disabled={submitting || loadingSetup} className="sm:min-w-[220px]">
                {submitting ? 'Placing call…' : 'Place Test Call'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <Card title="Setup Summary">
            {loadingSetup ? (
              <p className="text-sm text-slate-400 py-6 text-center">Loading setup…</p>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active numbers</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-1">{activeOutboundNumbers.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outbound rules</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-1">{outboundRules.length}</p>
                </div>
                {selectedRule && (
                  <div className="p-3 rounded-xl border border-brand-100 bg-brand-50/40">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Selected rule</p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{selectedRule.name}</p>
                    <p className="text-xs font-mono text-slate-500 mt-1">{selectedRule.id}</p>
                    <div className="mt-2">
                      <Badge variant="info">Agent {selectedRule.dispatch?.agent?.id || '—'}</Badge>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="Last Call Result">
            {!lastResult ? (
              <p className="text-sm text-slate-400 py-6 text-center">No test call placed yet</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">{lastResult.message || 'Call initiated'}</p>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Call ID</span>
                    <span className="text-xs font-mono text-slate-800">{lastResult.data?.callId || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Status</span>
                    <Badge variant="warning">{lastResult.data?.status || '—'}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Room</span>
                    <span className="text-xs font-mono text-slate-800">{lastResult.data?.roomId || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">From → To</span>
                    <span className="text-xs font-semibold text-slate-800">
                      {lastResult.data?.sipCallFrom || '—'} → {lastResult.data?.sipCallTo || '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TestCallPage;
