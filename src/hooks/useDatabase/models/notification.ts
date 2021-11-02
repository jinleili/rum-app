import { Database, SummaryObjectType } from 'hooks/useDatabase';
import * as CommentModel from 'hooks/useDatabase/models/comment';
import * as ObjectModel from 'hooks/useDatabase/models/object';

export enum NotificationType {
  objectLike = 'objectLike',
  commentLike = 'commentLike',
  commentObject = 'commentObject',
  commentReply = 'commentReply',
}

export enum NotificationStatus {
  read = 'read',
  unread = 'unread',
}

export interface IDbNotification extends IDbNotificationPayload {
  Id?: string;
  TimeStamp: number;
}

export interface IDbNotificationPayload {
  GroupId: string;
  ObjectTrxId: string;
  Type: NotificationType;
  Status: NotificationStatus;
}

export interface IDbDerivedNotification extends IDbNotification {
  object: any;
}

export const create = async (
  db: Database,
  notification: IDbNotificationPayload
) => {
  await db.notifications.add({
    ...notification,
    TimeStamp: Date.now() * 1000000,
  });
  await syncSummary(db, notification);
};

export const markAsRead = async (db: Database, Id: string) => {
  await db.notifications
    .where({
      Id,
    })
    .modify({
      Status: NotificationStatus.read,
    });
  const notification = await db.notifications.get({
    Id,
  });
  if (notification) {
    await syncSummary(db, notification);
  }
};

const syncSummary = async (
  db: Database,
  notification: IDbNotificationPayload
) => {
  const summaryQuery = {
    ObjectId: '',
    ObjectType: '' as SummaryObjectType,
  };
  if (notification.Type === NotificationType.objectLike) {
    summaryQuery.ObjectType = SummaryObjectType.notificationUnreadObjectLike;
  } else if (notification.Type === NotificationType.commentLike) {
    summaryQuery.ObjectType = SummaryObjectType.notificationUnreadCommentLike;
  } else if (notification.Type === NotificationType.commentObject) {
    summaryQuery.ObjectType = SummaryObjectType.notificationUnreadCommentObject;
  } else if (notification.Type === NotificationType.commentReply) {
    summaryQuery.ObjectType = SummaryObjectType.notificationUnreadCommentReply;
  }
  const count = await db.notifications
    .where({
      Type: notification.Type,
      Status: NotificationStatus.unread,
    })
    .count();
  const existSummary = await db.summary.get(summaryQuery);
  if (existSummary) {
    await db.summary.where(summaryQuery).modify({
      Count: count,
    });
  } else {
    await db.summary.add({
      ...summaryQuery,
      GroupId: notification.GroupId,
      Count: count,
    });
  }
};

export interface IUnreadCountMap {
  [SummaryObjectType.notificationUnreadObjectLike]: number;
  [SummaryObjectType.notificationUnreadCommentLike]: number;
  [SummaryObjectType.notificationUnreadCommentObject]: number;
  [SummaryObjectType.notificationUnreadCommentReply]: number;
}

export const getUnreadCountMap = async (
  db: Database,
  options: {
    GroupId: string;
  }
) => {
  const summaries = await Promise.all([
    db.summary.get({
      GroupId: options.GroupId,
      ObjectType: SummaryObjectType.notificationUnreadObjectLike,
    }),
    db.summary.get({
      GroupId: options.GroupId,
      ObjectType: SummaryObjectType.notificationUnreadCommentLike,
    }),
    db.summary.get({
      GroupId: options.GroupId,
      ObjectType: SummaryObjectType.notificationUnreadCommentObject,
    }),
    db.summary.get({
      GroupId: options.GroupId,
      ObjectType: SummaryObjectType.notificationUnreadCommentReply,
    }),
  ]);
  return {
    [SummaryObjectType.notificationUnreadObjectLike]: summaries[0]
      ? summaries[0].Count
      : 0,
    [SummaryObjectType.notificationUnreadCommentLike]: summaries[1]
      ? summaries[1].Count
      : 0,
    [SummaryObjectType.notificationUnreadCommentObject]: summaries[2]
      ? summaries[2].Count
      : 0,
    [SummaryObjectType.notificationUnreadCommentReply]: summaries[3]
      ? summaries[3].Count
      : 0,
  } as IUnreadCountMap;
};

export const list = async (
  db: Database,
  options: {
    GroupId: string;
    Types: NotificationType[];
    limit: number;
    offset?: number;
  }
) => {
  const notifications = await db.notifications
    .where({
      GroupId: options.GroupId,
    })
    .filter((notification) => options.Types.includes(notification.Type))
    .reverse()
    .offset(options.offset || 0)
    .limit(options.limit)
    .toArray();

  if (notifications.length === 0) {
    return [];
  }

  const result = await Promise.all(
    notifications.map((notification) => {
      return packNotification(db, notification);
    })
  );

  return result;
};

const packNotification = async (
  db: Database,
  notification: IDbNotification
) => {
  let object = null as any;
  if (notification.Type === NotificationType.objectLike) {
    object = await ObjectModel.get(db, {
      TrxId: notification.ObjectTrxId,
    });
  } else if (
    [
      NotificationType.commentLike,
      NotificationType.commentObject,
      NotificationType.commentReply,
    ].includes(notification.Type)
  ) {
    object = await CommentModel.get(db, {
      TrxId: notification.ObjectTrxId,
    });
  }
  return {
    ...notification,
    object,
  } as IDbDerivedNotification;
};