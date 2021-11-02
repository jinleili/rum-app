import React from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import classNames from 'classnames';
import { urlify, ago } from 'utils';
import { RiThumbUpLine, RiThumbUpFill } from 'react-icons/ri';
import { useStore } from 'store';
import { IDbDerivedCommentItem } from 'hooks/useDatabase/models/comment';
import { IDbDerivedObjectItem } from 'hooks/useDatabase/models/object';
import { ObjectsFilterType } from 'store/activeGroup';
import Avatar from 'components/Avatar';
import { BsFillCaretDownFill } from 'react-icons/bs';
import useSubmitVote from 'hooks/useSubmitVote';
import { IVoteType, IVoteObjectType } from 'apis/group';
import ContentSyncStatus from 'components/ContentSyncStatus';

interface IProps {
  comment: IDbDerivedCommentItem;
  object: IDbDerivedObjectItem;
  selectComment?: any;
  highlight?: boolean;
  isTopComment?: boolean;
  disabledReply?: boolean;
  inObjectDetailModal?: boolean;
}

export default observer((props: IProps) => {
  const state = useLocalObservable(() => ({
    canExpand: false,
    expand: false,
    anchorEl: null,
  }));
  const { commentStore, activeGroupStore, modalStore } = useStore();
  const commentRef = React.useRef<any>();
  const { comment, isTopComment, disabledReply } = props;
  const isSubComment = !isTopComment;

  const submitVote = useSubmitVote();

  React.useEffect(() => {
    const setCanExpand = () => {
      if (
        commentRef.current &&
        commentRef.current.scrollHeight > commentRef.current.clientHeight
      ) {
        state.canExpand = true;
      } else {
        state.canExpand = false;
      }
    };

    setCanExpand();
    window.addEventListener('resize', setCanExpand);
    return () => {
      window.removeEventListener('resize', setCanExpand);
    };
  }, [state, commentStore, comment.TrxId]);

  const isOwner = false;
  const { threadTrxId } = comment.Content;
  const { replyComment } = comment.Extra;
  const domElementId = `comment_${
    props.inObjectDetailModal ? 'in_object_detail_modal' : ''
  }_${comment.TrxId}`;
  const highlight = domElementId === commentStore.highlightDomElementId;

  const UserName = (props: {
    name: string;
    isObjectOwner: boolean;
    isTopComment?: boolean;
  }) => {
    return (
      <span
        className={classNames({
          'text-12 bg-black text-white rounded font-bold opacity-60 px-1':
            props.isObjectOwner,
          'text-gray-88': !props.isObjectOwner,
          'py-[3px] mb-[2px] inline-block': props.isTopComment,
          'mr-[1px]': !props.isTopComment,
        })}
      >
        {props.name}
      </span>
    );
  };

  return (
    <div
      className={classNames(
        {
          highlight: highlight,
          'mt-[10px]': isTopComment,
          'mt-1': isSubComment,
        },
        'comment-item p-2 duration-500 ease-in-out -mx-2 rounded-6'
      )}
      id={`${domElementId}`}
    >
      <div className="relative">
        <div
          className={classNames(
            {
              'mt-[-4px]': isTopComment,
              'mt-[-3px]': isSubComment,
            },
            'avatar absolute top-0 left-0'
          )}
        >
          <Avatar
            className="block"
            profile={comment.Extra.user.profile}
            size={isSubComment ? 28 : 34}
            onClick={() => {
              activeGroupStore.setObjectsFilter({
                type: ObjectsFilterType.SOMEONE,
                publisher: comment.Publisher,
              });
            }}
          />
        </div>
        <div
          className={classNames({
            'ml-[7px]': isSubComment,
            'ml-3': !isSubComment,
          })}
          style={{ paddingLeft: isSubComment ? 28 : 34 }}
        >
          <div>
            <div className="1flex 1items-center leading-none text-14 text-gray-99 relative">
              {!isSubComment && (
                <span
                  className={'1truncate text-14 text-gray-88'}
                  onClick={() => {
                    activeGroupStore.setObjectsFilter({
                      type: ObjectsFilterType.SOMEONE,
                      publisher: comment.Publisher,
                    });
                  }}
                >
                  <UserName
                    name={comment.Extra.user.profile.name}
                    isObjectOwner={
                      comment.Extra.user.publisher === props.object.Publisher
                    }
                    isTopComment
                  />
                </span>
              )}
              {isSubComment && (
                <span
                  className={classNames(
                    {
                      'comment-expand': state.expand,
                    },
                    'comment-body comment text-gray-1e break-words whitespace-pre-wrap ml-[1px] comment-fold'
                  )}
                  ref={commentRef}
                >
                  <UserName
                    name={comment.Extra.user.profile.name}
                    isObjectOwner={
                      comment.Extra.user.publisher === props.object.Publisher
                    }
                  />
                  {threadTrxId &&
                  replyComment &&
                  threadTrxId !== replyComment.TrxId ? (
                    <span>
                      <span className="opacity-80 mx-1">回复</span>
                      <UserName
                        name={replyComment.Extra.user.profile.name}
                        isObjectOwner={
                          replyComment.Extra.user.publisher ===
                          props.object.Publisher
                        }
                      />
                      ：
                    </span>
                  ) : (
                    '：'
                  )}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: urlify(`${comment.Content.content}`),
                    }}
                  />
                </span>
              )}
              {isSubComment && !state.expand && state.canExpand && (
                <div
                  className="text-blue-400 cursor-pointer pt-[6px] pb-[2px] ml-[1px] flex items-center text-12"
                  onClick={() => (state.expand = true)}
                >
                  展开
                  <BsFillCaretDownFill className="text-12 ml-[1px] opacity-70" />
                </div>
              )}
            </div>
          </div>
          <div className="mt-[6px]">
            {!isSubComment && (
              <div className="mb-1">
                <div
                  className={classNames(
                    {
                      'comment-expand': state.expand,
                      'pr-1': isSubComment,
                    },
                    'comment-body comment text-gray-1e break-words whitespace-pre-wrap comment-fold'
                  )}
                  ref={commentRef}
                  dangerouslySetInnerHTML={{
                    __html: urlify(comment.Content.content),
                  }}
                />
                {!state.expand && state.canExpand && (
                  <div
                    className="text-blue-400 cursor-pointer pt-1 flex items-center text-12"
                    onClick={() => (state.expand = true)}
                  >
                    展开
                    <BsFillCaretDownFill className="text-12 ml-[1px] opacity-70" />
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center text-gray-af leading-none mt-[10px]">
              <div
                className="text-12 mr-3 tracking-wide opacity-80"
                onClick={() => {
                  modalStore.objectDetail.show({
                    objectTrxId: activeGroupStore.objectTrxIds[0],
                  });
                }}
              >
                {ago(comment.TimeStamp)}
              </div>
              {!isOwner && !disabledReply && (
                <span
                  className="flex items-center cursor-pointer justify-center w-10 tracking-wide"
                  onClick={() => {
                    modalStore.commentReply.show({
                      commentTrxId: comment.TrxId,
                    });
                  }}
                >
                  <span className="flex items-center text-12 pr-1">回复</span>
                </span>
              )}
              <div
                className="flex items-center cursor-pointer justify-center w-10 tracking-wide mr-1"
                onClick={() =>
                  !comment.Extra.voted &&
                  submitVote({
                    type: IVoteType.up,
                    objectTrxId: comment.TrxId,
                    objectType: IVoteObjectType.comment,
                  })
                }
              >
                <span className="flex items-center text-14 pr-1">
                  {comment.Extra.voted ? (
                    <RiThumbUpFill className="text-black opacity-60" />
                  ) : (
                    <RiThumbUpLine />
                  )}
                </span>
                <span className="text-12 text-gray-9b mr-[2px]">
                  {Number(comment.Extra.upVoteCount) || ''}
                </span>
              </div>
              <div className="transform scale-75">
                <ContentSyncStatus status={comment.Status} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .name-max-width {
          max-width: 140px;
        }
        .gray {
          color: #8b8b8b;
        }
        .dark {
          color: #404040;
        }
        .highlight {
          background: #e2f6ff;
        }
        .comment-body {
          font-size: 14px;
          line-height: 1.625;
        }
        .comment-fold {
          overflow: hidden;
          text-overflow: ellipsis;
          -webkit-line-clamp: 6;
          -webkit-box-orient: vertical;
          display: -webkit-box;
        }
        .comment-expand {
          max-height: unset !important;
          -webkit-line-clamp: unset !important;
        }
        .more {
          height: 18px;
        }
        .top-label {
          top: -2px;
          right: -42px;
        }
        .top-label.md {
          right: -48px;
        }
        .comment-item {
          transition-property: background-color;
        }
        .comment-item .more-entry.md {
          display: none;
        }
        .comment-item:hover .more-entry.md {
          display: flex;
        }
      `}</style>
    </div>
  );
});