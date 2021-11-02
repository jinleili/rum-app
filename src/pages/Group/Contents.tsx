import React from 'react';
import { observer, useLocalStore } from 'mobx-react-lite';
import Content from './Content';
import { useStore } from 'store';
import { IContentItem } from 'apis/group';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { sleep } from 'utils';
import Fade from '@material-ui/core/Fade';
import Button from 'components/Button';
import GroupApi from 'apis/group';
import usePrevious from 'hooks/usePrevious';

export default observer(() => {
  const { activeGroupStore, groupStore } = useStore();
  const state = useLocalStore(() => ({
    loadingMore: false,
    visibleCount: 0,
    isFetchingUnreadContents: false,
  }));
  const prevContentTotal = usePrevious(activeGroupStore.contentTotal) || 0;

  const hasMore = state.visibleCount < activeGroupStore.contentTotal;
  const unreadCount = groupStore.unReadCountMap[activeGroupStore.id] || 0;

  const contents = React.useMemo(() => {
    return activeGroupStore.contents.slice(0, state.visibleCount);
  }, [activeGroupStore, state.visibleCount]);

  React.useEffect(() => {
    if (prevContentTotal > 0) {
      state.visibleCount += activeGroupStore.contentTotal - prevContentTotal;
    }
  }, [activeGroupStore.contentTotal]);

  const infiniteRef: any = useInfiniteScroll({
    loading: state.loadingMore,
    hasNextPage: hasMore,
    scrollContainer: 'parent',
    threshold: 200,
    onLoadMore: async () => {
      if (state.loadingMore || state.isFetchingUnreadContents) {
        return;
      }
      state.loadingMore = true;
      state.visibleCount = Math.min(
        state.visibleCount + 20,
        activeGroupStore.contentTotal
      );
      await sleep(200);
      state.loadingMore = false;
    },
  });

  const fetchUnreadContents = async () => {
    state.isFetchingUnreadContents = true;
    const contents = await GroupApi.fetchContents(activeGroupStore.id);
    const storeLatestContent = activeGroupStore.contents[0];
    if (storeLatestContent) {
      activeGroupStore.addLatestContentTimeStamp(storeLatestContent.TimeStamp);
    }
    const unreadContents = (contents || [])
      .filter(
        (content) =>
          content.TimeStamp >
          groupStore.latestContentTimeStampMap[activeGroupStore.id]
      )
      .sort((a, b) => b.TimeStamp - a.TimeStamp);
    if (unreadContents.length > 0) {
      activeGroupStore.addContents(unreadContents);
      const latestContent = unreadContents[0];
      groupStore.setLatestContentTimeStamp(
        activeGroupStore.id,
        latestContent.TimeStamp
      );
      groupStore.updateUnReadCountMap(activeGroupStore.id, 0);
    }
    state.isFetchingUnreadContents = false;
  };

  return (
    <div ref={infiniteRef}>
      {unreadCount > 0 && (
        <div className="relative w-full">
          <div className="flex justify-center absolute left-0 w-full -top-2 z-10">
            <Fade in={true} timeout={500}>
              <div>
                <Button className="shadow-xl" onClick={fetchUnreadContents}>
                  收到新的内容
                  {state.isFetchingUnreadContents ? ' ...' : ''}
                </Button>
              </div>
            </Fade>
          </div>
        </div>
      )}
      <div>
        {contents.map((content: IContentItem) => (
          <div key={content.TrxId}>
            <Fade in={true} timeout={250}>
              <div>
                {activeGroupStore.latestContentTimeStampSet.has(
                  content.TimeStamp
                ) && (
                  <div className="w-full text-12 text-center py-6 pb-3 text-gray-400">
                    上次看到这里
                  </div>
                )}
                <div className="cursor-pointer">
                  <Content content={content} />
                </div>
              </div>
            </Fade>
          </div>
        ))}
        {!state.loadingMore && !hasMore && contents.length > 5 && (
          <div className="pt-6 pb-3 text-center text-12 text-gray-400 opacity-80">
            没有更多内容了哦
          </div>
        )}
      </div>
    </div>
  );
});
