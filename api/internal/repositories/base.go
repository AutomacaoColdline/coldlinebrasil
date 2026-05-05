package repositories

import (
	"context"
	"encoding/json"
	"reflect"

	"gorm.io/gorm"
)

type Repository[T any] struct {
	db    *gorm.DB
	table string
}

func New[T any](db *gorm.DB, table string) *Repository[T] {
	return &Repository[T]{db: db, table: table}
}

func (r *Repository[T]) Q(ctx context.Context) *gorm.DB {
	return r.db.WithContext(ctx).Table(r.table)
}

func (r *Repository[T]) FindAll(ctx context.Context) ([]T, error) {
	var results []T
	return results, r.Q(ctx).Find(&results).Error
}

func (r *Repository[T]) FindByID(ctx context.Context, id string) (*T, error) {
	var result T
	if err := r.Q(ctx).Where("id = ?", id).First(&result).Error; err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *Repository[T]) FindOne(ctx context.Context, where string, args ...interface{}) (*T, error) {
	var result T
	if err := r.Q(ctx).Where(where, args...).First(&result).Error; err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *Repository[T]) Create(ctx context.Context, doc *T) error {
	return r.Q(ctx).Create(doc).Error
}

func (r *Repository[T]) Save(ctx context.Context, doc *T) error {
	return r.Q(ctx).Save(doc).Error
}

// MergeUpdate fetches the current record, JSON-merges the payload, restores the
// primary key, then saves — equivalent to a MongoDB $set patch.
func (r *Repository[T]) MergeUpdate(ctx context.Context, id string, payload map[string]interface{}) error {
	var current T
	if err := r.Q(ctx).Where("id = ?", id).First(&current).Error; err != nil {
		return err
	}
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(b, &current); err != nil {
		return err
	}
	// Restore ID (payload may have omitted it)
	if f := reflect.ValueOf(&current).Elem().FieldByName("ID"); f.IsValid() && f.CanSet() && f.Kind() == reflect.String {
		f.SetString(id)
	}
	return r.Q(ctx).Save(&current).Error
}

func (r *Repository[T]) Delete(ctx context.Context, id string) error {
	var zero T
	return r.Q(ctx).Where("id = ?", id).Delete(&zero).Error
}

func (r *Repository[T]) Count(ctx context.Context, where string, args ...interface{}) (int64, error) {
	var count int64
	return count, r.Q(ctx).Where(where, args...).Count(&count).Error
}
