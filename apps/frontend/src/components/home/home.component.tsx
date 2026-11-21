'use client';

import { FC, ReactNode, useCallback, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { expandPostsList } from '@gitroom/helpers/utils/posts.list.minify';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { PlatformIcon } from '@gitroom/frontend/components/ui/platform.icon.component';
import {
  fromUtc,
  newDayjs,
} from '@gitroom/frontend/components/layout/set.timezone';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';

type ListedPost = {
  id: string;
  content: string;
  publishDate: string;
  state: string;
  error?: string | null;
  releaseURL?: string | null;
  integration: {
    id: string;
    providerIdentifier: string;
    name: string;
    picture?: string | null;
  };
};

type PostsList = { posts: ListedPost[]; total: number };

// Each SWR lives in its own hook (rules of hooks).
const usePostsList = (state: 'scheduled' | 'published' | 'error', limit: number) => {
  const fetch = useFetch();
  const load = useCallback(
    async (path: string) =>
      expandPostsList(await (await fetch(path)).json()) as PostsList,
    []
  );
  return useSWR(`/posts/list?state=${state}&limit=${limit}`, load, {
    revalidateOnFocus: true,
    refreshInterval: 60000,
  });
};

const plain = (html: string) =>
  (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const short = (text: string, max: number) =>
  text.length > max ? text.slice(0, max - 1) + '…' : text;

const Card: FC<{ title: string; action?: { href: string; label: string }; children: ReactNode; className?: string }> = ({
  title,
  action,
  children,
  className,
}) => (
  <section
    className={clsx(
      'lz-home-card rounded-[14px] border border-newTableBorder bg-newBgColorInner p-[20px] flex flex-col gap-[14px]',
      className
    )}
  >
    <div className="flex items-center justify-between gap-[12px]">
      <h2 className="text-[16px] font-[600]">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="text-[13px] text-newTableTextFocused hover:underline whitespace-nowrap"
        >
          {action.label}
        </Link>
      )}
    </div>
    {children}
  </section>
);

const Kpi: FC<{ label: string; value: number | string; tone?: 'default' | 'good' | 'bad'; href?: string }> = ({
  label,
  value,
  tone = 'default',
  href,
}) => {
  const body = (
    <div
      className={clsx(
        'lz-home-card rounded-[14px] border bg-newBgColorInner p-[20px] flex flex-col gap-[6px] h-full',
        tone === 'bad' && Number(value) > 0
          ? 'border-red-500/50'
          : 'border-newTableBorder'
      )}
    >
      <div className="text-[13px] text-newTableText">{label}</div>
      <div
        className={clsx(
          'text-[36px] leading-[40px] font-semibold tracking-tight',
          tone === 'good' && 'text-newTableTextFocused',
          tone === 'bad' && Number(value) > 0 && 'text-red-400'
        )}
      >
        {value}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
};

const PostRow: FC<{ post: ListedPost; right?: ReactNode }> = ({ post, right }) => (
  <div className="flex items-center gap-[12px] min-w-0">
    <div className="relative shrink-0 w-[32px] h-[32px]">
      <img
        className="w-[32px] h-[32px] rounded-[8px] object-cover"
        src={post.integration?.picture || '/no-picture.jpg'}
        alt=""
      />
      <PlatformIcon
        identifier={post.integration?.providerIdentifier}
        size={14}
        className="absolute -bottom-[4px] -end-[4px] z-10"
        iconClassName="w-[14px] h-[14px] rounded-[4px] border border-fifth"
        markClassName="bg-newBgColorInner"
      />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[14px] truncate">
        {short(plain(post.content), 90) || '—'}
      </div>
      <div className="text-[12px] text-newTableText">
        {fromUtc(post.publishDate).format(
          isUSCitizen() ? 'ddd D MMM, hh:mm A' : 'ddd D MMM, HH:mm'
        )}
      </div>
    </div>
    {right}
  </div>
);

export const HomeComponent: FC = () => {
  const t = useT();
  const user = useUser();
  const { data: integrations } = useIntegrationList();
  const { data: scheduled } = usePostsList('scheduled', 6);
  const { data: published } = usePostsList('published', 100);
  const { data: failed } = usePostsList('error', 5);

  const hour = newDayjs().hour();
  const greeting =
    hour < 12
      ? t('home_greeting_morning', 'Good morning')
      : hour < 19
      ? t('home_greeting_afternoon', 'Good afternoon')
      : t('home_greeting_evening', 'Good evening');
  const firstName = (user?.name || '').split(' ')[0];

  const week = useMemo(() => {
    const since = newDayjs().subtract(7, 'day');
    const mine = (published?.posts || []).filter((p) =>
      fromUtc(p.publishDate).isAfter(since)
    );
    const byChannel = new Map<
      string,
      { name: string; identifier: string; picture?: string | null; count: number }
    >();
    for (const p of mine) {
      const key = p.integration?.id || 'x';
      const row = byChannel.get(key) || {
        name: p.integration?.name || '',
        identifier: p.integration?.providerIdentifier || '',
        picture: p.integration?.picture,
        count: 0,
      };
      row.count += 1;
      byChannel.set(key, row);
    }
    const rows = [...byChannel.values()].sort((a, b) => b.count - a.count);
    return { total: mine.length, rows, max: rows[0]?.count || 1 };
  }, [published]);

  const connected = (integrations || []).filter(
    (i: any) => !i.disabled && !i.refreshNeeded && !i.inBetweenSteps
  );
  const needAttention = (integrations || []).filter(
    (i: any) => i.refreshNeeded || i.inBetweenSteps
  );
  const disabled = (integrations || []).filter((i: any) => i.disabled);

  return (
    <div className="flex flex-1 flex-col gap-[20px] overflow-auto p-[24px] mobile:p-[14px] scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[24px] font-[600]">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <div className="text-[14px] text-newTableText">
          {t('home_subtitle', 'This is how your publishing is doing')}
        </div>
      </div>

      <div className="grid grid-cols-4 tablet:grid-cols-2 mobile:grid-cols-2 gap-[14px]">
        <Kpi
          label={t('home_published_week', 'Published this week')}
          value={week.total}
          tone="good"
        />
        <Kpi
          label={t('home_scheduled', 'Scheduled')}
          value={scheduled?.total ?? 0}
          href="/launches"
        />
        <Kpi
          label={t('with_error', 'With error')}
          value={failed?.total ?? 0}
          tone="bad"
          href="/launches"
        />
        <Kpi
          label={t('home_channels_ok', 'Connected channels')}
          value={`${connected.length}/${(integrations || []).length}`}
        />
      </div>

      <div className="grid grid-cols-2 tablet:grid-cols-1 mobile:grid-cols-1 gap-[14px]">
        <Card
          title={t('home_up_next', 'Up next')}
          action={{ href: '/launches', label: t('home_view_all', 'View all') }}
        >
          {(scheduled?.posts || []).length === 0 ? (
            <div className="text-[14px] text-newTableText py-[12px]">
              {t('home_nothing_scheduled', 'Nothing scheduled right now.')}
            </div>
          ) : (
            <div className="flex flex-col gap-[14px]">
              {scheduled!.posts.slice(0, 5).map((p) => (
                <PostRow key={p.id} post={p} />
              ))}
            </div>
          )}
        </Card>

        <Card
          title={t('home_needs_attention', 'Needs attention')}
          action={
            (failed?.total ?? 0) > 0
              ? { href: '/launches', label: t('home_review', 'Review and retry') }
              : undefined
          }
        >
          {(failed?.posts || []).length === 0 ? (
            <div className="text-[14px] text-newTableText py-[12px]">
              {t('home_all_good', 'All good: no posts with errors.')}
            </div>
          ) : (
            <div className="flex flex-col gap-[14px]">
              {failed!.posts.map((p) => (
                <PostRow
                  key={p.id}
                  post={p}
                  right={
                    <span className="text-[12px] text-red-400 whitespace-nowrap">
                      {t('with_error', 'With error')}
                    </span>
                  }
                />
              ))}
            </div>
          )}
          {needAttention.length > 0 && (
            <div className="text-[13px] text-red-400">
              {t('home_reconnect', 'Reconnect these channels')}:{' '}
              {needAttention.map((i: any) => i.name).join(', ')}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 tablet:grid-cols-1 mobile:grid-cols-1 gap-[14px]">
        <Card title={t('home_by_channel', 'Published by channel (7 days)')}>
          {week.rows.length === 0 ? (
            <div className="text-[14px] text-newTableText py-[12px]">
              {t('home_no_week', 'No posts were published in the last 7 days.')}
            </div>
          ) : (
            <div className="flex flex-col gap-[12px]">
              {week.rows.map((r) => (
                <div key={r.identifier + r.name} className="flex items-center gap-[12px]">
                  <PlatformIcon
                    identifier={r.identifier}
                    size={20}
                    iconClassName="w-[20px] h-[20px] rounded-[6px]"
                  />
                  <div className="w-[140px] shrink-0 text-[14px] truncate">{r.name}</div>
                  <div className="flex-1 h-[8px] rounded-full bg-newColColor overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--lanza-gold)]"
                      style={{ width: `${Math.max(6, (r.count / week.max) * 100)}%` }}
                    />
                  </div>
                  <div className="w-[28px] text-end text-[14px] font-[600] tabular-nums">
                    {r.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={t('home_channels', 'Your channels')}
          action={{ href: '/launches', label: t('home_manage', 'Manage') }}
        >
          <div className="flex flex-wrap gap-[10px]">
            {(integrations || []).map((i: any) => (
              <div
                key={i.id}
                className={clsx(
                  'flex items-center gap-[8px] rounded-[10px] border px-[10px] py-[6px] text-[13px]',
                  i.disabled
                    ? 'border-newTableBorder opacity-50'
                    : i.refreshNeeded || i.inBetweenSteps
                    ? 'border-red-500/50'
                    : 'border-newTableBorder'
                )}
              >
                <PlatformIcon
                  identifier={i.identifier}
                  size={18}
                  iconClassName="w-[18px] h-[18px] rounded-[5px]"
                />
                <span className="truncate max-w-[140px]">{i.name}</span>
                {i.disabled && (
                  <span className="text-newTableText">
                    · {t('home_disabled', 'Disabled')}
                  </span>
                )}
                {(i.refreshNeeded || i.inBetweenSteps) && (
                  <span className="text-red-400">
                    · {t('home_reconnect_short', 'Reconnect')}
                  </span>
                )}
              </div>
            ))}
          </div>
          {disabled.length > 0 && (
            <div className="text-[12px] text-newTableText">
              {t('home_disabled_note', 'Disabled channels do not publish.')}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
